const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
require('./disconnect-patch.js');
const TABLE_NAME = "build-session-001";
let dissconnectWs = undefined;
let wsStatus = undefined;

function init(event) {
    console.log(event)
    const apigwManagementApi = new AWS.ApiGatewayManagementApi({ apiVersion: '2018-11-29', endpoint: event.requestContext.domainName + '/' + event.requestContext.stage });
    dissconnectWs = async (connectionId) => {
        await apigwManagementApi.deleteConnection({ ConnectionId: connectionId }).promise();
    }
}

function getGameSession(playerId) {
    return ddb.scan({
        TableName: TABLE_NAME,
        FilterExpression: "#p1 = :playerId or #p2 = :playerId",
        ExpressionAttributeNames: {
            "#p1": "player1",
            "#p2": "player2"
        },
        ExpressionAttributeValues: {
            ":playerId": playerId
        }
    }).promise();
}

async function closeGame(uuid) {
    ddb.update({
        TableName: TABLE_NAME,
        Key: {
            "uuid": uuid
        },
        UpdateExpression: "set gameStatus = :status",
        ExpressionAttributeValues: {
            ":status": "closed"
        }
    }).promise();
}

exports.handler = (event, context, callback) => {
    console.log("Disconnect event received: %j", event);
    init(event);

    let connectionIdForCurrentRequest = event.requestContext.connectionId;
    dissconnectWs(connectionIdForCurrentRequest).then(() => { }, (err) => {
        console.log("Error closing connection, player 1 probably already closed.");
        console.log(err)
    });

    return callback(null, { statusCode: 200, });
}