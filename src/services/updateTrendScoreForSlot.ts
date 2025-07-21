import SlotModel, { ISlot } from "../models/SlotModel";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export async function updateTrendScoreForSlot(slotId: string) {
    const slot: ISlot | null = await SlotModel.findById(slotId);
    if (!slot) throw new Error(`Slot not found: ${slotId}`);

    // Calculate days since meetingDate
    const daysAgo = Math.floor((Date.now() - new Date(slot.meetingDate).getTime()) / MS_PER_DAY);

    // Decay factor: half-life every 7 days (example)
    const decay = Math.pow(0.5, daysAgo / 7);

    // Calculate trendScore = engagementRate (0-100) * decay factor
    const newTrendScore = Math.round(slot.engagementRate * decay);

    if (slot.trendScore !== newTrendScore) {
        slot.trendScore = newTrendScore;
        await slot.save();
    }

    return slot.trendScore;
}