const {
  SecretsManagerClient,
  CancelRotateSecretCommand,
} = require("@aws-sdk/client-secrets-manager");
const axios = require("axios");
const secretsManager = new AWS.SecretsManager({ region: "us-east-1" });
const rotateKey = async (event) => {
  const secretId = event.SecretId;
  const client = new SecretsManagerClient({ region: process.env.AWS_REGION });

  const currentSecretValue = await client.send(
    new GetSecretValueCommand({
      SecretId: secretId,
    })
  );

  const tokenInfo = JSON.parse(currentSecretValue.SecretString);

  let newToken;
  if (tokenInfo.provider === "dropbox") {
    // console.log(tokenInfo.refresh_token.replace('a', 'b'))
    const url = "https://api.dropbox.com/oauth2/token";
    const data = new URLSearchParams();
    data.append("grant_type", "refresh_token");
    data.append("refresh_token", tokenInfo.refresh_token);
    data.append("client_id", "ybb500u8ux1i0in");
    data.append("client_secret", "8nfrmi6btkgcj43");
    try {
      newToken = await axios.post(url, data);
    } catch (error) {
      console.log("error refreshing dropbox token", error);
    }
  } else {
    const url = "https://auth.shootproof.com/oauth2/authorization/token";
    const data = new URLSearchParams();
    data.append("grant_type", "refresh_token");
    data.append("refresh_token", tokenInfo.refresh_token);
    data.append("scope", "studio");
    try {
      newToken = await axios.post(url, data);
    } catch (error) {
      console.log("error refreshing shootproof token", error);
    }
  }

  await secretsManager
    .updateSecret({
      SecretId: secretId,
      SecretString: JSON.stringify({ ...tokenInfo, ...newToken.data }),
    })
    .promise();

  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        message: "Token refreshed successfully",
        input: event,
        currentSecretValue,
      },
      null,
      2
    ),
  };

  // Use this code if you don't use the http event with the LAMBDA-PROXY integration
  // return { message: 'Go Serverless v1.0! Your function executed successfully!', event };
};
module.exports.rotateKey = rotateKey;

// rotateKey({
//   SecretId:
//     "arn:aws:secretsmanager:us-east-1:344719897423:secret:Brand/5/DB-local-48sXrI",
// });
