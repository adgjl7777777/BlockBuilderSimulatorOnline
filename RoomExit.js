const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
require('./room-patch.js');
let send = undefined;
const TABLE_LOBBY = "loby-session-001";
const TABLE_LEGO = "ingame-builder";
var sender = [];
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

function getBlocks(rooms, connectionId, preferId) {
    console.log("3");
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

function deleteBlocks(rooms, connectionId, preferId) {
    console.log("special1");
    return getBlocks(rooms, connectionId, preferId).then((data) => {
        console.log(data);
        console.log("special1");
        if (data.Count >= 1) {

            console.log("special2");
            for (var i = 0; i < data.Count; i++) {

                ddb.delete({
                    TableName: TABLE_LEGO,
                    Key: {
                        "RoomName": rooms,
                        "LegoName": data.Items[i].LegoName
                    }

                }, function (err, datas) {
                    if (err) console.log(err);
                    else console.log(datas);
                }).promise();
            }
        }
    });
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

function setRoom(rooms, connectionId, preferId, userId) {
    console.log("2");
    return getRoom(rooms).then((data) => {
        sender = data.Item.RoomMemberID.filter(word => word != connectionId && word != "");
        if (data.Item.RoomMasterID != connectionId && data.Item.RoomMasterID != "") {
            sender.push(data.Item.RoomMasterID);
        }
        console.log("wawa");
        console.log(data);
        if (typeof data == "undefined" || data == null || data == "" || Object.keys(data).length == 0) {
            return -2;
        }
        else {
            if (data.Item.CurrentPlayerNum == 1) {
                return Promise.all([deleteBlocks(rooms, connectionId, preferId),
                ddb.delete({
                    TableName: TABLE_LOBBY,
                    Key: {
                        "RoomId": rooms
                    }

                }, function (err, datas) {
                    if (err) console.log(err);
                    else console.log(datas);
                })
                ]);
            }
            else if (data.Item.RoomMasterID == connectionId) {

                return ddb.update({
                    TableName: TABLE_LOBBY,
                    Key: {
                        "RoomId": rooms
                    },
                    UpdateExpression: "set #rma = :rma, #rmaid = :rmaid, #cpn = :cpn, #rm = :rm, #rmid = :rmid",
                    ExpressionAttributeNames: {
                        "#rma": "RoomMaster",
                        "#rmaid": "RoomMasterID",
                        "#cpn": "CurrentPlayerNum",
                        "#rm": "RoomMember",
                        "#rmid": "RoomMemberID"
                    },
                    ExpressionAttributeValues: {
                        ":rma": data.Item.RoomMember.shift(),
                        ":rmaid": data.Item.RoomMemberID.shift(),
                        ":cpn": data.Item.RoomMember.length + 1,
                        ":rm": data.Item.RoomMember,
                        ":rmid": data.Item.RoomMemberID
                    }
                }, function (err, datas) {
                    if (err) console.log(err);
                    else console.log(datas);
                }).promise();
            }
            else {

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
                        ":cpn": data.Item.RoomMember.filter((element) => element !== preferId).length + 1,
                        ":rm": data.Item.RoomMember.filter((element) => element !== preferId),
                        ":rmid": data.Item.RoomMemberID.filter((element) => element !== connectionId)
                    }
                }, function (err, datas) {
                    if (err) console.log(err);
                    else console.log(datas);
                }).promise();
            }
        }
    });
}

function sendResponse(rooms, connectionId, preferId, userId) {
    console.log("4");
    return setRoom(rooms, connectionId, preferId, userId).then((data) => {
        for (var i = 0; i < sender.length; i++) {
            if (sender[i] != connectionId && sender[i] != "") {
                send(sender[i], '{"action":"ConnectionList","info1": ' + JSON.stringify(sender) + '}');
                send(sender[i], '{"action":"PlayerDeleter","info1": "' + userId + '"}');
            }
        }
        send(connectionId, '{"action":"Allower","info1": " "}');
        console.log("TOTALDATA");
        console.log(data);
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
        sendResponse(message.info1, connectionIdForCurrentRequest, message.info2, message.info3);
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
