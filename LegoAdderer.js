const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
require('./lego-patch.js');
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

function addBlock(messager) {
    console.log("1");
    return ddb.put({
        TableName: TABLE_LEGO,
        Item: {
            "RoomName": messager.RoomName,
            "LegoName": messager.LegoName,
            "LegoType": messager.LegoType,
            "Color": messager.Color,
            "Detail": messager.Detail,
            "Pos": messager.Pos,
            "Rot": messager.Rot,
        }
    }, function (err, datas) {
        if (err) console.log(err);
        else console.log(datas);
    });
}
function findusers(messager) {
    console.log("2");
    return ddb.get({
        TableName: TABLE_LOBBY,
        Key: {
            "RoomId": messager.RoomName
        }
    }, function (err, datas) {
        if (err) console.log(err);
        else console.log(datas);
    }).promise();
}

function sendBlock(messages, connectionId) {
    console.log("3");
    return findusers(messages.info1[0]).then((data) => {
        for (var i = 0; i < data.Item.RoomMemberID.length; i++) {
            if (data.Item.RoomMemberID[i] != connectionId && data.Item.RoomMemberID[i] != "") {
                console.log("wow");
                send(data.Item.RoomMemberID[i], JSON.stringify(messages));
            }
        }
        if (data.Item.RoomMasterID != connectionId && data.Item.RoomMasterID != "") {
            send(data.Item.RoomMasterID, JSON.stringify(messages));
        }
        console.log("end");
    });
}

exports.handler = (event, context, callback) => {
    console.log("Event received: %j", event);
    init(event);

    let message = JSON.parse(event.body);
    console.log("message: %j", message);

    let connectionIdForCurrentRequest = event.requestContext.connectionId;
    console.log("Current connection id: " + connectionIdForCurrentRequest);
    if (message && message.info1) {
        Promise.all([addBlock(message.info1[0]), sendBlock(message, connectionIdForCurrentRequest)]);
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
