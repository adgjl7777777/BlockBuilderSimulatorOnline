const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
require('./player-patch.js');
let send = undefined;
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

function sendBlock(messages, connectionId) {
    console.log("3");
    for (var i = 0; i < messages.info3.length; i++) {
        if (messages.info3[i] != connectionId) {
            try { send(messages.info3[i], JSON.stringify(messages)) }
            catch (errors) { console.log(errors) }
        }
    }
}

exports.handler = (event, context, callback) => {
    console.log("Event received: %j", event);
    init(event);

    let message = JSON.parse(event.body);
    console.log("message: %j", message);

    let connectionIdForCurrentRequest = event.requestContext.connectionId;
    console.log("Current connection id: " + connectionIdForCurrentRequest);
    if (message && message.info1) {
        Promise.all([sendBlock(message, connectionIdForCurrentRequest)]);
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
