const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
require('./room-patch.js');
let send = undefined;
const TABLE_LEGO = "ingame-builder";
const TABLE_LOBBY = "loby-session-001";

function init(event) {
    const apigwManagementApi = new AWS.ApiGatewayManagementApi({
        apiVersion: '2018-11-29',
        endpoint: event.requestContext.domainName + '/' + event.requestContext.stage
    });
    send = async (connectionId, data) => {
        await apigwManagementApi.postToConnection({
            ConnectionId: connectionId,
            Data: `${data}`
        }).promise();
    };
}

function getRoom(rooms) {
    console.log("1");
    return ddb.get({
        TableName: TABLE_LOBBY,
        Key: {
            "RoomId": rooms
        }
    }, function (err, datas) {
        if (err) console.log(err);
        else console.log(datas);
    }).promise();
}

function setRoom(rooms, connectionId, preferId) {
    console.log("2");
    return getRoom(rooms).then((data) => {
        var sender = data.Item.RoomMemberID.filter(word => word != "");
        if (sender.Length < 1 || typeof sender == "undefined") {
            console.log(sender.Length);
            if (data.Item.RoomMasterID != connectionId && data.Item.RoomMasterID != "") {
                sender = [data.Item.RoomMasterID];
            }
        }
        else {
            console.log(sender.Length);
            if (data.Item.RoomMasterID != connectionId && data.Item.RoomMasterID != "") {
                sender.push(data.Item.RoomMasterID);
            }

        }
        if (sender.Length < 1 || typeof sender == "undefined") {
            console.log(sender.Length);
            sender = [connectionId];
        }
        else {
            console.log(sender.Length);
            sender.push(connectionId);

        }
        for (var i = 0; i < sender.length; i++) {
            send(sender[i], '{"action":"ConnectionList","info1": ' + JSON.stringify(sender) + '}');

        }
        console.log("5");
        console.log(data);
        console.log("5");
        if (!data || typeof data == "undefined" || data == null || data == "" || Object.keys(data).length == 0) {
            return -2;
        }
        else if (data.Item.CurrentPlayerNum >= data.Item.MaxPlayerNum) {
            return -1;
        }
        else {
            data.Item.RoomMember.push(preferId);
            console.log(data.Item.RoomMember);
            data.Item.RoomMemberID.push(connectionId);
            console.log(data.Item.RoomMemberID);
            console.log("sasa");
            return ddb.update({
                TableName: TABLE_LOBBY,
                Key: {
                    "RoomId": rooms
                },
                UpdateExpression: "set #cpn = :cpn, #rm = :rm, #rmid = :rmid",
                ExpressionAttributeNames: {
                    "#cpn": "CurrentPlayerNum",
                    "#rm": "RoomMember",
                    "#rmid": "RoomMemberID"
                },
                ExpressionAttributeValues: {
                    ":cpn": data.Item.CurrentPlayerNum + 1,
                    ":rm": data.Item.RoomMember,
                    ":rmid": data.Item.RoomMemberID
                }
            }, function (err, datas) {
                if (err) console.log(err);
                else console.log(datas);
            }).promise();
        }
    });
}

function getBlocks(rooms, connectionId, preferId) {
    console.log("3");
    return setRoom(rooms, connectionId, preferId).then((data) => {
        console.log("6");
        console.log(data != -2);
        console.log(data != -1);
        if (data != -2 && data != -1) {
            console.log("whwhw");
            return ddb.query({
                TableName: TABLE_LEGO,
                KeyConditionExpression: 'RoomName = :rm',
                ExpressionAttributeValues: {
                    ':rm': rooms
                }
            }, function (err, datas) {
                if (err) console.log(err);
                else console.log(datas);
            }).promise();


        }
        else {
            console.log("why");
            return data;
        }
    });
}


function sendBlocks(rooms, connectionId, preferId) {
    console.log("4");
    return getBlocks(rooms, connectionId, preferId).then((data) => {
        console.log("TOTALDATA");
        console.log(data);
        if (data == -2) {
            send(connectionId, '{"action":"lobbyerror","info1": "The Room is Invalid!"}');
        }
        else if (data == -1) {
            send(connectionId, '{"action":"lobbyerror","info1": "The Room is Full!"}');
        }
        else if (!data) {
            send(connectionId, '{"action":"lobbyerror","info1": "Error occured!"}');
        }
        else if (data.Count < 1) {
            send(connectionId, '{"action":"firstblock","info1": []}');
        }
        else {
            send(connectionId, '{"action":"firstblock","info1": ' + JSON.stringify(data.Items) + '}');
        }
    });
}

exports.handler = (event, context, callback) => {
    console.log("Event received: %j", event);
    init(event);

    let message = JSON.parse(event.body);
    console.log("message: %j", message);

    let connectionIdForCurrentRequest = event.requestContext.connectionId;
    console.log("Current connection id: " + connectionIdForCurrentRequest);
    if (message && message.info1 && message.info2) {
        try {
            sendBlocks(message.info1, connectionIdForCurrentRequest, message.info2);
        }
        catch (error) {
            send(connectionIdForCurrentRequest, '{"action":"Fatalerror","info1": "Error occured!"}');
        }
        callback(null, {
            statusCode: 200,
        });
    }


    else {

        callback(null, {
            statusCode: 401
        });
    }
}
