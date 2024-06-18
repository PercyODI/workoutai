import OpenAI from "openai";

const ai = new OpenAI({
    baseURL: "https://8a9a-173-31-200-190.ngrok-free.app/v1/",
    apiKey: ""
});

(async () => {
    const chat = await ai.chat.completions.create({
        messages: [{ role: "user", content: "What are the top scoring poker hands?" }],
        model: "llama3-8b-instruct"
    })

    console.log({ chat })
})