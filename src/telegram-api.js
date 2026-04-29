import fs from "node:fs";

export class TelegramApi {
  constructor(botToken) {
    this.baseUrl = `https://api.telegram.org/bot${botToken}`;
    this.fileBaseUrl = `https://api.telegram.org/file/bot${botToken}`;
  }

  async call(method, payload = {}, file) {
    let options;

    if (file) {
      const form = new FormData();
      for (const [key, value] of Object.entries(payload)) {
        form.append(key, value);
      }
      form.append(file.field, new Blob([fs.readFileSync(file.path)]), file.filename);
      options = { method: "POST", body: form };
    } else {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(payload)) {
        params.append(key, String(value));
      }
      options = { method: "POST", body: params };
    }

    const response = await fetch(`${this.baseUrl}/${method}`, options);
    const json = await response.json();
    if (!json.ok) {
      throw new Error(`Telegram API error: ${JSON.stringify(json)}`);
    }
    return json.result;
  }

  async downloadFile(filePath, destination) {
    const response = await fetch(`${this.fileBaseUrl}/${filePath}`);
    if (!response.ok) {
      throw new Error(`Cannot download file: ${response.status} ${response.statusText}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.promises.writeFile(destination, buffer);
    return destination;
  }
}
