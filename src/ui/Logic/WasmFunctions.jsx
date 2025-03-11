
// Parameters (1): numKeys int
export const generateDHKeys = async (numKeys) => {
    return new Promise((resolve) => {
        const res = window.generateDHKeys(numKeys);
        resolve(res);
    });
};

// Paramters (3): otherPubDH string, msg string, timestamp string
export const encryptMsg = async (otherPubDH, msg, timestamp) => {
    return new Promise((resolve) => {
        const res = window.encryptMsg(otherPubDH, msg, timestamp);
        resolve(res);
    });
};

// Paramters (4): cipherText string, timestamp string, otherPubDH string || masterSec string, myPrvDH string || null
export const decryptMsg = async (cipherText, timestamp, otherPubDH, myPrvDH) => {
    return new Promise((resolve) => {
        const res = window.decryptMsg(cipherText, timestamp, otherPubDH, myPrvDH);
        resolve(res);
    });
};

// call on registration, no Paramters
export const genOnRegister = async () => {
    return new Promise((resolve) => {
        const res = window.genOnRegister();
        resolve(res);
    });
};

// Paramters (7): other_pub_IdentityKey string, other_pub_SchnorrKey string, other_SchnorrSignature string, 
//				  other_pub_OnetimePreKey string, my_priv_identityKey string, plainText string, timestamp string 
export const x3DHSender = async (otherPubIK, otherPubSK, otherPubSig, otherPubOPK, myPrvIK, msg, timestamp) => {
    return new Promise((resolve) => {
        const res = window.x3DHSender(otherPubIK, otherPubSK, otherPubSig, otherPubOPK, myPrvIK, msg, timestamp);
        resolve(res);
    });
};

// Paramters (9): other_pub_IdentityKey string, other_pub_SchnorrKey string, other_SchnorrSignature string,
//				  other_pub_EphamiralKey string, my_priv_IdentityKey string, my_priv_SchnorrKey string,
//				  my_priv_OnetimePreKey string, cipherText string, timestamp string
export const x3DHReceiver = async (otherPubIK, otherPubSK, otherPubSig, otherPubEK, myPrvIK, myPrvSK, myPrvOPK, cipherText, timestamp) => {
    return new Promise((resolve) => {
        const res = window.x3DHReceiver(otherPubIK, otherPubSK, otherPubSig, otherPubEK, myPrvIK, myPrvSK, myPrvOPK, cipherText, timestamp);
        resolve(res);
    });
};

// Paramters (4): other_pub_DiffieHellmanKey string, rootKey string, plainText string, timestamp string
export const senderFirst = async (otherPubDH, rK, msg, timestamp) => {
    return new Promise((resolve) => {
        const res = window.senderFirst(otherPubDH, rK, msg, timestamp);
        resolve(res);
    });
};

// Paramters (3): sendingChainKey string, plainText string, timestamp string
export const sender = async (sCK, msg, timestamp) => {
    return new Promise((resolve) => {
        const res = window.sender(sCK, msg, timestamp);
        resolve(res);
    });
};

// Paramters (5): other_pub_DiffieHellmanKey string, my_priv_DiffieHellmanKey string, rootKey string, cipherText string, timestamp string
export const receiverFirst = async (otherPubDH, myPrivDH, rK, cipherText, timestamp) => {
    return new Promise((resolve) => {
        const res = window.receiverFirst(otherPubDH, myPrivDH, rK, cipherText, timestamp);
        resolve(res);
    });
};

// Paramters (3): receivingChainKey string, cipherText string, timestamp string
export const receiver = async (rCK, cipherText, timestamp) => {
    return new Promise((resolve) => {
        const res = window.receiver(rCK, cipherText, timestamp);
        resolve(res);
    });
};

// Paramters (2): messageKey string, cipherText string
export const mKDecrypt = async (mK, cipherText) => {
    return new Promise((resolve) => {
        const res = window.mKDecrypt(mK, cipherText);
        resolve(res);
    });
};