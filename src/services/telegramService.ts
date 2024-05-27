import axios from "axios";

const sendMessage = async (chatId: string, message: string) => {
  try {
    const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
    const data = {
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
    };
    await axios.post(url, data);
  } catch (error) {
    console.error(error);
  }
};

export default {
  sendMessage,
};
