package logic

import (
	"AnonyMouse/encryption/model"
	"crypto/aes"
	"crypto/cipher"
	"crypto/ecdh"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
)

func getMasterSecret(otherPubDHBytes, timestamp []byte, prvKey *ecdh.PrivateKey) ([]byte, string, error) {
	crv := ecdh.P256()
	otherPubDH, err := crv.NewPublicKey(otherPubDHBytes)
	if err != nil {
		return nil, "", err
	}

	if prvKey == nil {
		prvKey, err = crv.GenerateKey(rand.Reader)
		if err != nil {
			return nil, "", err
		}
	}
	pubKey := prvKey.PublicKey().Bytes()

	sharedSec, err := prvKey.ECDH(otherPubDH)
	if err != nil {
		return nil, "", err
	}

	preMaster := append(sharedSec, timestamp...)

	h := sha256.New()
	h.Write(preMaster)
	masterSec := h.Sum(nil)

	return masterSec, hex.EncodeToString(pubKey), nil
}

func encryptGCM(key, msg []byte) (string, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return "", err
	}

	cipherBytes := gcm.Seal(nonce, nonce, msg, nil)
	cipherText := hex.EncodeToString(cipherBytes)

	return cipherText, nil
}

func decryptGCM(key, cipherBytes []byte) (string, error) {

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	if len(cipherBytes) < gcm.NonceSize() {
		return "", errors.New("Ciphertext too short")
	}

	nonce := cipherBytes[:gcm.NonceSize()]
	cipherBytes = cipherBytes[gcm.NonceSize():]

	plainBytes, err := gcm.Open(nil, nonce, cipherBytes, nil)
	if err != nil {
		return "", err
	}

	return string(plainBytes), nil
}

func generateKeyPair(id int) (model.DHKey, error) {
	crv := ecdh.P256()
	privKey, err := crv.GenerateKey(rand.Reader)
	if err != nil {
		return model.DHKey{}, err
	}

	pubKey := hex.EncodeToString(privKey.PublicKey().Bytes())
	privKeyStr := hex.EncodeToString(privKey.Bytes())

	key := model.DHKey{Id: id, PubKey: pubKey, PrivKey: privKeyStr}

	return key, nil
}
