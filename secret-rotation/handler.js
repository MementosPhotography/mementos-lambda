const {
  SecretsManagerClient,
  UpdateSecretCommand,
  GetSecretValueCommand,
} = require("@aws-sdk/client-secrets-manager");
const axios = require("axios");

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
  const data = new URLSearchParams();
  data.append("grant_type", "refresh_token");

  if (tokenInfo.provider === "dropbox") {
    const url = "https://api.dropbox.com/oauth2/token";
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
    data.append("refresh_token", tokenInfo.refresh_token);
    data.append("scope", "studio");
    try {
      newToken = await axios.post(url, data);
    } catch (error) {
      console.log("error refreshing shootproof token", error);
    }
  }

  await secretsManager.send(
    new UpdateSecretCommand({
      SecretId: secretId,
      SecretString: JSON.stringify({ ...tokenInfo, ...newToken.data }),
    })
  );

  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        message: `Update ${secretId} successfully`,
        input: event,
      },
      null,
      2
    ),
  };
};
module.exports.rotateKey = rotateKey;
