import mongoose, { Schema, Document } from "mongoose";
import BankSchema from "./Banks";
import GoalsSchema, { IGoal } from "./Goals";

export interface User extends Document {
    username: string;
    email: string;
    password: string;
    otp: string;
    otpExpiry: Date;
    isVerified: boolean;
    banksCount: number;
    banks: [typeof BankSchema];
    goals: IGoal[];
}

const UserSchema: Schema<User> = new Schema({
    username: {
        type: String,
        required: [true, "Username is required"],
        trim: true,
        unique: true
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        match: [/.+\@.+\..+/, "Please use a valid email address"]
    },
    password: {
        type: String,
        required: [true, "Password is required"]
    },
    otp: {
        type: String,
        required: [true, "OTP is required"],
        default: ''
    },
    otpExpiry: {
        type: Date,
        required: [true, "OTP expiry not provided"]
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    banksCount: {
        type: Number,
        default: 0
    },
    banks: {
        type: [BankSchema],
        default: []
    },
    goals: {
        type: [GoalsSchema],
        default: []
    }
});

const UserModel = (mongoose.models.Users as mongoose.Model<User>) || mongoose.model<User>("Users", UserSchema);

export default UserModel;
