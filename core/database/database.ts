export { getDB, closeDB } from "./db.js";

export {
    type MessageRow,
    type CompactType,

    initMessagesTable,

    insertMessage,

    markCompactByToolCall,
    markCompactById,
    markSnipped,
    markSummarized,

    getMessages,
    getMaxSeq,
} from "./messages.js";
