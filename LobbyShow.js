const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
require('./lobby-patch.js');
let send = undefined;
const TABLE_NAME = "loby-session-001";
const TABLE_NAME_TOTAL = "total-lobby";

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
    }
}

function getTotalLobbyConnections(connectionId) {
    return ddb.scan({
        TableName: TABLE_NAME_TOTAL,
        FilterExpression: "#id = :connectionId",
        ExpressionAttributeNames: {
            "#id": "id"
        },
        ExpressionAttributeValues: {
            ":connectionId": connectionId,
        }
    }).promise();
}

function setTotalLobbyConnections(connectionId, realId, preferId, changetype) {
    console.log("Event received: %j", preferId);
    return getTotalLobbyConnections(connectionId).then((data) => {
        if (data && data.Count == 1) {
            if (changetype == "update") {
                return ddb.update({
                    TableName: TABLE_NAME_TOTAL,
                    Key: {
                        "id": connectionId
                    },
                    UpdateExpression: "set realid = :realId and set preferid = :preferId",
                    ExpressionAttributeValues: {
                        ":realid": realId,
                        ":preferid": preferId
                    }
                }, function (err, datas) {
                    if (err) console.log(err);
                    else console.log(datas);
                });
            }
            else if (changetype == "disconnect") {
                console.log('what');
                return ddb.delete({
                    TableName: TABLE_NAME_TOTAL,
                    Key: {
                        "id": connectionId
                    }
                }, function (err, datas) {
                    if (err) console.log(err);
                    else console.log(datas);
                });
            }
            else {
                return null;
            }
        }
        else {
            if (changetype == "connect") {
                return ddb.put({
                    TableName: TABLE_NAME_TOTAL,
                    Item: {
                        id: connectionId,
                        realid: realId,
                        preferid: preferId
                    }
                }, function (err, datas) {
                    if (err) console.log(err);
                    else console.log(datas);
                });
            }
            else {
                return null;
            }
        }
    });
}


function getLobbyConnections() {
    return ddb.scan({
        TableName: TABLE_NAME,
    }).promise();
}

function sendLobbyConnection(connectionIdForCurrentRequest) {
    return getLobbyConnections().then((data) => {
        send(connectionIdForCurrentRequest, '{"action":"lobbylist","info1": ' + JSON.stringify(data.Items) + '}');
        console.log("Data: %j", JSON.stringify(data.Items));
    });
}

exports.handler = (event, context, callback) => {
    console.log("Event received: %j", event);
    init(event);

    let message = JSON.parse(event.body);
    console.log("message: %j", message);

    let connectionIdForCurrentRequest = event.requestContext.connectionId;
    console.log("Current connection id: " + connectionIdForCurrentRequest);

    if (message && message.info1 && message.info2 && message.info3) {
        if (message.info3 == "disconnect") {
            Promise.all([setTotalLobbyConnections(connectionIdForCurrentRequest, message.info1, message.info2, message.info3)]);
        }
        else {
            Promise.all([sendLobbyConnection(connectionIdForCurrentRequest), setTotalLobbyConnections(connectionIdForCurrentRequest, message.info1, message.info2, message.info3)]);
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
