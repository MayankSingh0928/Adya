import mongoose from 'mongoose';

const attemptSchema = new mongoose.Schema({
  delivered: { type: Number, default: 0, min: 0 }, returned: { type: Number, default: 0, min: 0 },
  paid: { type: Number, default: 0, min: 0 }, paymentMode: { type: String, enum: ['Cash', 'UPI'], default: 'Cash' },
  notes: String, date: { type: Date, default: Date.now }, by: { type: String, default: '' }
}, { timestamps: true });

const userSchema = new mongoose.Schema({ name: { type: String, required: true }, username: { type: String, unique: true, required: true }, passwordHash: { type: String, required: true }, role: { type: String, enum: ['admin', 'operator', 'viewer'], required: true }, active: { type: Boolean, default: true } }, { timestamps: true });
const orderSchema = new mongoose.Schema({
  customerName: { type: String, required: true }, customerPhone: { type: String, required: true, index: true }, location: { type: String, default: '' },
  category: { type: String, enum: ['Regular', 'Walk-In', 'Local Event'], required: true }, container: { type: String, enum: ['Jar', 'Capsule'], default: 'Jar' },
  quantity: { type: Number, required: true, min: 1 }, price: { type: Number, required: true, min: 0 },
  frequency: { type: String, enum: ['Daily', 'Alternate Day', 'Custom Days'], default: null }, customDays: [{ type: Number, min: 0, max: 6 }],
  startDate: Date, nextDueDate: Date, timeSlot: String, deliveryDate: Date,
  attempts: [attemptSchema], active: { type: Boolean, default: true }, createdBy: String
}, { timestamps: true });
const expenseSchema = new mongoose.Schema({ title: { type: String, required: true }, amount: { type: Number, required: true, min: 0 }, category: { type: String, default: 'Other' }, date: { type: Date, default: Date.now }, notes: String, by: String }, { timestamps: true });
export const User = mongoose.model('User', userSchema);
export const Order = mongoose.model('Order', orderSchema);
export const Expense = mongoose.model('Expense', expenseSchema);
