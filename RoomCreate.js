const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
require('./room-patch.js');
let send = undefined;
const TABLE_NAME = "loby-session-001";

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

function makeRoom(connectionId, messager) {
    return ddb.put({
        TableName: TABLE_NAME,
        Item: {
            RoomId: messager.RoomId,
            CurrentPlayerNum: 1,
            GameStatus: 0,
            GameType: messager.GameType,
            MaxPlayerNum: messager.MaxPlayerNum,
            RoomKey: messager.RoomKey,
            RoomMaster: messager.RoomMaster,
            RoomMasterID: connectionId,
            RoomName: messager.RoomName,
            RoomMember: [],
            RoomMemberID: []

        }
    }, function(err, datas) {
        if (err) console.log(err);
        else console.log(datas);
    }).promise();
}

function sendConnection(connectionId, messager) {
    return makeRoom(connectionId, messager).then((data) => {
        send(connectionId, '{"action":"firstblock","info1": []}');
    });
}

exports.handler = (event, context, callback) => {
    console.log("Event received: %j", event);
    init(event);

    let message = JSON.parse(event.body);
    console.log("message: %j", message);

    let connectionIdForCurrentRequest = event.requestContext.connectionId;
    console.log("Current connection id: " + connectionIdForCurrentRequest);

    if (message && message.RoomId) {
        sendConnection(connectionIdForCurrentRequest,message);

        callback(null, {
            statusCode: 200,
        });

    }
    else {

        callback(null, {
            statusCode: 401
        });
    }
};
