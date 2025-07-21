import mongoose, { Schema, Document } from "mongoose";
import { IRegisterStatus } from "./SlotModel";

export interface IUserFollowInfo {
    userId: string;
    startedFrom: Date;
}

//  * Interface for booked slots
export interface IBookedSlots {
    userId: string;
    slotId: string;
    status: IRegisterStatus;
}

// * Interface for User document
export interface IUsers extends Document {
    username: string;
    title: string;
    email: string;
    password: string;
    image: string;
    profession: string;
    timeZone: string;
    searchScore: number;
    trendScore: number;
    followers: IUserFollowInfo[];
    following: IUserFollowInfo[];
    bookedSlots: IBookedSlots[];
    registeredSlots: string[];
    disabledNotificationUsers: string[];
    countOfNotifications: number; // * this is for refreshing notifications
    isNewsFeedRefreshed: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// * Users Schema
const UserSchema = new Schema<IUsers>(
    {
        username: {
            type: String,
            required: [true, "Username is required"],
            unique: true,
            trim: true,
            minlength: [3, "Username must be at least 3 characters"],
        },
        title: {
            type: String,
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            match: [
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                "Please enter a valid email address",
            ],
            index: true, // ? Improves search performance
        },
        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: [6, "Password must be at least 6 characters"],
        },
        image: {
            type: String,
        },
        profession: {
            type: String
        },
        timeZone: {
            type: String,
            required: [true, "Time zone is required"],
        },
        searchScore: {
            type: Number,
            default: 0,
            min: 0,
        },
        trendScore: {
            type: Number,
            default: 0,
            min: 0,
        },
        followers: [
            {
                userId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "users",
                    required: true,
                },
                startedFrom: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
        following: [
            {
                userId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "users",
                    required: true,
                },
                startedFrom: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
        bookedSlots: [
            {
                userId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "users",
                    required: true,
                },
                slotId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "slots",
                    required: true,
                    index: true
                },
                status: {
                    type: String,
                    enum: ["upcoming", "ongoing", "completed", "expired"],
                    required: true,
                },
            },
        ],
        countOfNotifications: {
            type: Number,
            default: 0
        },
        isNewsFeedRefreshed: {
            type: Boolean,
            default: true
        },
        registeredSlots: [{ type: mongoose.Schema.Types.ObjectId, ref: "slots" }],
        disabledNotificationUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }]
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

const UserModel = mongoose.models.users || mongoose.model<IUsers>("users", UserSchema);
export default UserModel;
