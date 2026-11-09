import mongoose, { Schema, model } from "mongoose";
import bcrypt from "bcrypt";

const authSchema = new Schema(
  {
    fullname: {
      type: String,
      required: true,
      trim: true,
      maxlength: 12,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ["super-admin", "admin"],
      default: "admin",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    refreshToken: {
      type: String,
      select: false,
      default: null,
    },
    refreshTokenHistory: { type: [String], default: [], select: false },
    sessionVersion: { type: Number, default: 0 },
    expiry: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

authSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

authSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  if (!candidatePassword || !this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

const AuthModel = mongoose.models.Auth || model("Auth", authSchema);
export default AuthModel;
