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

function delBlock(messager) {
    console.log("1");
    return ddb.delete({
        TableName: TABLE_LEGO,
        Key: {
            "RoomName": messager.info1,
            "LegoName": messager.info2,
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
            "RoomId": messager.info1
        }
    }, function (err, datas) {
        if (err) console.log(err);
        else console.log(datas);
    }).promise();
}

function sendBlock(messages, connectionId) {
    console.log("3");
    return findusers(messages).then((data) => {
        for (var i = 0; i < data.Item.RoomMemberID.length; i++) {
            if (data.Item.RoomMemberID[i] != connectionId && data.Item.RoomMemberID[i] != "") {
                console.log("yes1");
                send(data.Item.RoomMemberID[i], JSON.stringify(messages));
            }
        }
        if (data.Item.RoomMasterID != connectionId && data.Item.RoomMasterID != "") {
            console.log("yes2");
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
        Promise.all([delBlock(message), sendBlock(message, connectionIdForCurrentRequest)]);
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
