import { inject, injectable } from "inversify";
import { IAppConfig } from "../IAppConfig";
import { TYPES } from "../types";
import OpenAI from "openai";
import { ChatHistory } from "./ChatHistory";
import { appendFile } from "fs/promises";
import { PathLike } from "fs";
function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
export type PersonaProps = {
    name: string;
    role: string;
    description: string;
}

@injectable()
export class Persona {
    public name: string
    public role: string;
    private systemMessage: string
    openAi: OpenAI;
    constructor(@inject(TYPES.IAppConfig) private appConfig: IAppConfig, props: PersonaProps) {
        this.name = props.name
        this.role = props.role

        this.systemMessage = `You are taking on the persona of a ${props.role}, with the name ${props.name}.\n`
        this.systemMessage += `\n---\nPersona description: ${props.description}`;

        this.openAi = new OpenAI({
            apiKey: appConfig.openaiKey
        })
    }

    async voteOnResponding(meetingHistory: ChatHistory): Promise<{ raiseHand: boolean, thoughts: string, priority: number, persona: Persona }> {
        const params: OpenAI.Chat.ChatCompletionCreateParams = {
            messages: [{
                role: "system",
                content: this.systemMessage + `\n---\nYou must respond as a JSON object. The object will take this form: {
                    "thoughts": "<<Your thoughts on the topic, that you don't want to say out loud>>",
                    "raiseHand": boolean,
                    "priority": <<number from 1 to 100 representing how badly you want to respond>>
                }`
            }, {
                role: "user",
                content: "Meeting so far: \n" +
                    meetingHistory.historyToString() +
                    "\n You must respond. If you don't want to contribute at this junction, set raiseHand to false."
            }],
            response_format: {
                type: "json_object"
            },
            model: "gpt-4o",
            stream: true
        }

        let valueJson: any;
        let complete = false;
        while (!complete) {
            try {
                const chatCompletionStream = await this.openAi.chat.completions.create(params);

                process.stdout.write("\n\n## " + this.name + "\n---\n")
                let retVal = ""
                for await (const chunk of chatCompletionStream) {
                    const newStr = chunk.choices[0]?.delta.content
                    if (newStr) {
                        process.stdout.write(newStr)
                        retVal += newStr
                    }
                }

                valueJson = JSON.parse(retVal)
                complete = true;
            } catch (err) {
                if (err instanceof OpenAI.APIError) {
                    if (err.status === 429 && err.headers) {
                        console.log("---\n----\n---\n---Waiting for rate limit: " + err.headers["retry-after"])
                        await delay(Number(err.headers["retry-after"]) * 1000)
                        continue;
                    }
                }
                throw err
            }
        }
        return {
            persona: this,
            raiseHand: Boolean(valueJson.raiseHand),
            thoughts: String(valueJson.thoughts),
            priority: Number(valueJson.priority)
        }
    }

    async updateNotes(notesPath: PathLike, meetingHistory: ChatHistory) {
        const params: OpenAI.Chat.ChatCompletionCreateParams = {
            messages: [{
                role: "system",
                content: this.systemMessage + `\n---\nGiven the meeting so far, you must update the notes.`
            }, {
                role: "user",
                content: "Meeting so far: \n" +
                    meetingHistory.historyToString()
            }],
            model: "gpt-4o",
            stream: true
        }

        let complete = false;
        while (!complete) {
            try {
                const chatCompletionStream = await this.openAi.chat.completions.create(params);
                appendFile(notesPath, `\n\n--------\n\n`)

                for await (const chunk of chatCompletionStream) {
                    const newStr = chunk.choices[0]?.delta.content
                    if (newStr) {
                        process.stdout.write(newStr)
                        appendFile(notesPath, newStr)
                    }
                }
                complete = true;
            } catch (err) {
                if (err instanceof OpenAI.APIError) {
                    if (err.status === 429 && err.headers) {
                        console.log("---\n----\n---\n---Waiting for rate limit: " + err.headers["retry-after"])
                        await delay(Number(err.headers["retry-after"]) * 1000)
                        continue;
                    }
                }
            }
        }
    }

    async receiveMeetingAndMaybeRespond(meetingHistory: ChatHistory, additionalPrompt?: string) {
        const params: OpenAI.Chat.ChatCompletionCreateParams = {
            messages: [{
                role: "system",
                content: this.systemMessage + `\n---\nYou must respond as a JSON object. The object will take this form: {
                    "thoughts": "<<Your thoughts on the topic, that you don't want to say out loud>>",
                    "message": "<<The message you want to say>>",
                    "action": "<<What you want to *do* at this point. This must be something that can be seen by the other participants.>>"
                }`
            }, {
                role: "user",
                content: "Meeting so far: \n" +
                    meetingHistory.historyToString() +
                    `${additionalPrompt ? additionalPrompt : ""}` +
                    "\nHow would you like to respond?"
            }],
            response_format: {
                type: "json_object"
            },
            model: "gpt-4o",
            stream: true
        }

        let complete = false;
        while (!complete) {
            try {
                const chatCompletionStream = await this.openAi.chat.completions.create(params);

                process.stdout.write("\n\n## " + this.name + "\n---\n")
                let retVal = ""
                for await (const chunk of chatCompletionStream) {
                    const newStr = chunk.choices[0]?.delta.content
                    if (newStr) {
                        process.stdout.write(newStr)
                        retVal += newStr
                    }
                }

                if (retVal !== 'pass') {
                    const valueJson = JSON.parse(retVal);

                    meetingHistory.addChat(this, valueJson["message"], valueJson["action"])
                }
                complete = true;
            } catch (err) {
                if (err instanceof OpenAI.APIError) {
                    if (err.status === 429 && err.headers) {
                        console.log("---\n----\n---\n---Waiting for rate limit: " + err.headers["retry-after"])
                        await delay(Number(err.headers["retry-after"]) * 1000)
                        continue;
                    }
                }
            }
        }
    }

    async startChatAsSelf(initPrompt: string) {
        const params: OpenAI.Chat.ChatCompletionCreateParams = {
            messages: [{
                role: "system",
                content: this.systemMessage + `\n---\nYou must respond as a JSON object. The object will take this form: {
                    "thoughts": "<<Your thoughts on the topic, that you don't want to say out loud>>",
                    "message": "<<The message you want to say>>",
                    "action": "<<What you want to *do* at this point.>>"
                }`
            }, {
                role: "user",
                content: "In your own words and voice, introduce this topic to start the meeting: " + initPrompt
            }],
            model: "gpt-4o",
            response_format: {
                type: "json_object"
            },
            stream: true
        };

        const chatCompletionStream = await this.openAi.chat.completions.create(params);

        let retVal = ""
        process.stdout.write("## " + this.name + "\n---\n")
        for await (const chunk of chatCompletionStream) {
            const newStr = chunk.choices[0]?.delta.content
            if (newStr) {
                process.stdout.write(newStr)
                retVal += newStr
            }
        }

        const valueJson = JSON.parse(retVal);

        const chatHist = new ChatHistory()
        chatHist.addChat(this, valueJson["message"], valueJson["action"]);

        return chatHist;
    }

    async introduceSelf() {
        const params: OpenAI.Chat.ChatCompletionCreateParams = {
            messages: [{
                role: "system",
                content: this.systemMessage
            }, {
                role: "user",
                content: "Introduce yourself to the rest of the group."
            }],
            model: "gpt-4o",
            stream: true
        };

        const chatCompletionStream = await this.openAi.chat.completions.create(params);

        let retVal = ""
        for await (const chunk of chatCompletionStream) {
            const newStr = chunk.choices[0]?.delta.content
            if (newStr) {
                process.stdout.write(newStr)
                retVal += newStr
            }
        }
    }
}