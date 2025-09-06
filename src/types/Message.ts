import { Document } from "mongoose";
import { Types } from "mongoose";

export interface IMessage extends Document{
    conversation: Types.ObjectId,
    sender: "user" | "bot",
    content: String,
    createdAt: Date;
}