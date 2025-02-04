
export const generateDHKeys = async (numKeys) => {// Parameters (1): numKeys int
    return new Promise((resolve) => {
        const res = window.generateDHKeys(numKeys);
        resolve(res);
    });
};

export const encryptMsg = async (otherPubDH, msg, timestamp) => {// Paramters (3): otherPubDH string, msg string, timestamp string
    return new Promise((resolve) => {
        const res = window.encryptMsg(otherPubDH, msg, timestamp);
        resolve(res);
    });
};

export const decryptMsg = async (cipherText, timestamp, otherPubDH, myPrvDH) => {// Paramters (4): cipherText string, timestamp string, otherPubDH string || masterSec string, myPrvDH string || null
    return new Promise((resolve) => {
        const res = window.decryptMsg(cipherText, timestamp, otherPubDH, myPrvDH);
        resolve(res);
    });
};