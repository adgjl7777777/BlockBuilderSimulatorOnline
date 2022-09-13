
const AWS = require('aws-sdk');
require('./join-patch.js');
let send = undefined;

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


exports.handler = (event, context, callback) => {
    console.log("Connect event received: %j", event);
    init(event);

    return callback(null, {
        statusCode: 200
    });
};