const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
require('./username-patch.js');
let send = undefined;
const TABLE_NAME = "username_saver";

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

function getTotalLobbyConnections(realId) {
    return ddb.scan({
        TableName: TABLE_NAME,
        FilterExpression: "#id = :connectionId",
        ExpressionAttributeNames: {
            "#id": "id"
        },
        ExpressionAttributeValues: {
            ":connectionId": realId,
        }
    }, function (err, datas) {
        if (err) console.log(err);
        else console.log(datas);
    }).promise();
}

function setTotalLobbyConnections(realId, connectionId) {
    console.log("Event received: %j", realId);
    return getTotalLobbyConnections(realId).then((data) => {
        if (data && data.Count < 1) {
            send(connectionId, '{"action":"username","info1": ""}');
        }
        else if (data) {
            send(connectionId, '{"action":"username","info1": "' + data.Items[0].username + '"}');
        }
    });
}
function setUsername(realId, preferId) {
    return ddb.put({
        TableName: TABLE_NAME,
        Item: {
            "id": realId,
            "username": preferId
        }
    }, function (err, datas) {
        if (err) console.log(err);
        else console.log(datas);
    }).promise();

}

function sendusername(realId, preferId, connectionId) {
    console.log("Event received: %j", realId);
    return setUsername(realId, preferId).then((data) => {
        send(connectionId, '{"action":"username","info1": "' + preferId + '"}');
    });
}
exports.handler = (event, context, callback) => {
    console.log("Event received: %j", event);
    init(event);

    let message = JSON.parse(event.body);
    console.log("message: %j", message);

    let connectionIdForCurrentRequest = event.requestContext.connectionId;
    console.log("Current connection id: " + connectionIdForCurrentRequest);

    if (message && message.info1 && message.info3) {
        if (message.info3 == "find") {
            setTotalLobbyConnections(message.info1, connectionIdForCurrentRequest);
        }
        if (message.info3 == "put") {
            sendusername(message.info1, message.info2, connectionIdForCurrentRequest);
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
};
