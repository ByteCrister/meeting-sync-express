import mongoose, { Document, Schema } from 'mongoose';
import { IVideoCallStatus } from '../utils/constants';

export interface IVideoCallSession {
    joinedAt: Date;
    leftAt?: Date;
}

export interface IVideoCallParticipant {
    userId: mongoose.Types.ObjectId | string;
    socketId: string;
    isMuted: boolean;
    isVideoOn: boolean;
    isScreenSharing?: boolean;
    sessions: IVideoCallSession[];
    isActive?: boolean; // Optional field to track if the participant is currently active
}

export interface IWaitingParticipants {
    userId: mongoose.Types.ObjectId | string;
    requestedAt: Date;
}

export interface IVideoCall extends Document {
    meetingId: mongoose.Types.ObjectId | string;
    hostId: mongoose.Types.ObjectId | string;
    waitingParticipants: IWaitingParticipants[];
    participants: IVideoCallParticipant[];
    status: IVideoCallStatus;
    startTime: Date;
    endTime?: Date;
    chatMessages: {
        _id: mongoose.Types.ObjectId;
        userId: mongoose.Types.ObjectId | string;
        message: string;
        timestamp: Date;
    }[];
    settings: {
        allowChat: boolean;
        allowScreenShare: boolean;
        allowRecording: boolean;
    };
}

const VideoCallSchema = new Schema<IVideoCall>(
    {
        meetingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'slots',
            required: true,
            index: true,
        },
        hostId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'users',
            required: true,
        },
        waitingParticipants: [{
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'users',
                required: true,
            },
            requestedAt: {
                type: Date,
                default: Date.now,
            },
        }],
        participants: [{
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'users',
                required: true,
            },
            socketId: {
                type: String
            },
            isMuted: {
                type: Boolean,
                default: false,
            },
            isScreenSharing: {
                type: Boolean,
                default: false,
            },
            isVideoOn: {
                type: Boolean,
                default: false,
            },
            sessions: [{
                joinedAt: { type: Date, default: Date.now },
                leftAt: { type: Date, default: null },
            }],
            isActive: {
                type: Boolean,
                default: true, // Default to true when participant is added
            }
        }],
        status: {
            type: String,
            enum: Object.values(IVideoCallStatus),
            default: IVideoCallStatus.WAITING,
        },
        startTime: {
            type: Date,
            default: Date.now,
        },
        endTime: {
            type: Date,
        },
        chatMessages: [{
            _id: {
                type: mongoose.Schema.Types.ObjectId,
                default: () => new mongoose.Types.ObjectId(),
            },
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'users',
                required: true,
            },
            message: {
                type: String,
                required: false,
                default: "",
            },
            timestamp: {
                type: Date,
                default: Date.now,
            },
        }],
        settings: {
            allowScreenShare: {
                type: Boolean,
                default: false,
            },
            allowRecording: {
                type: Boolean,
                default: false,
            },
            allowChat: {
                type: Boolean,
                default: false,
            }
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

const VideoCallModel = mongoose.models.videoCalls || mongoose.model<IVideoCall>('videoCalls', VideoCallSchema);
export default VideoCallModel; 