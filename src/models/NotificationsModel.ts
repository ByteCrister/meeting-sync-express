import mongoose, { Schema } from "mongoose";

export enum INotificationType {
    FOLLOW = "FOLLOW",
    RECEIVED_NOTIFICATION = "RECEIVED_NOTIFICATION",
    SLOT_CREATED = "SLOT_CREATED",
    SLOT_BOOKED = "SLOT_BOOKED",
    SLOT_UNBOOKED = "SLOT_UNBOOKED",
    SLOT_UPDATED = "SLOT_UPDATED",
    SLOT_DELETED = "SLOT_DELETED",
    MEETING_TIME_STARTED = "MEETING_TIME_STARTED",
    MEETING_STARTED = "MEETING_STARTED",
}

export interface INotification {
    _id?: string;
    type: INotificationType
    sender: mongoose.Types.ObjectId; // Who triggered the notification
    receiver: mongoose.Types.ObjectId; // Who receives it
    post?: mongoose.Types.ObjectId; // Optional: for new_post or post_update
    slot?: mongoose.Types.ObjectId; // Optional: for slot update
    message: string; // Human-readable content
    isRead: boolean; // Whether user clicked or saw it
    isClicked: boolean;
    createdAt: Date;
    expiresAt: Date; // New field to store expiration time
}

// Define notification schema
const NotificationSchema = new Schema<INotification>({
    type: { type: String, enum: INotificationType, required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
    post: { type: mongoose.Schema.Types.ObjectId, ref: "posts" }, // currently have no collections
    slot: { type: mongoose.Schema.Types.ObjectId, ref: "slots" },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    isClicked: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true }, // Expiration date field
});

// Middleware to automatically set the expiresAt field to 1 month from createdAt
NotificationSchema.pre("save", function (next) {
    if (this.createdAt) {
        this.expiresAt = new Date(this.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000); // 1 month
    }
    next();
});

// Create TTL index on expiresAt field (set the TTL to 0, meaning documents will be deleted once the expiresAt date has passed)
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const NotificationsModel = mongoose.models.notifications || mongoose.model("notifications", NotificationSchema);
export default NotificationsModel;