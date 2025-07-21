import mongoose, { Schema, Types, Document } from "mongoose";

// A message that the owner has sent
export interface IMessage {
    _id?: Types.ObjectId;
    message: string;
    time: Date;
    seen: boolean; // Seen by the recipient (optional tracking)
}

// Each participant's message list (only owner-sent messages)
export interface IParticipantChat {
    chats: IMessage[];
}

export interface IChatBox extends Document {
    ownerId: Types.ObjectId;
    participants: {
        [participantId: string]: IParticipantChat;
    };
    lastParticipants: Types.ObjectId | null;
    isChatBoxOpened: boolean;

}

const MessageSchema = new Schema<IMessage>(
    {
        message: { type: String, required: true },
        time: { type: Date, default: Date.now },
        seen: { type: Boolean, default: false }, // Seen by the receiver
    },
    { _id: true }
);

const ParticipantChatSchema = new Schema<IParticipantChat>(
    {
        chats: [MessageSchema],
    },
    { _id: false }
);

const ChatBoxSchema = new Schema<IChatBox>(
    {
        ownerId: { type: Schema.Types.ObjectId, ref: "users", required: true },
        participants: {
            type: Map,
            of: ParticipantChatSchema,
            default: {},
        },
        lastParticipants: { type: Schema.Types.ObjectId, ref: "users", default: null },
        isChatBoxOpened: { type: Boolean, default: true }, // Indicates if the chatbox is opened or closed
    },
    { timestamps: true }
);

export const ChatBoxModel = mongoose.models.chatboxes || mongoose.model<IChatBox>("chatboxes", ChatBoxSchema);