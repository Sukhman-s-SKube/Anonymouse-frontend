package main

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/ecdh"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"syscall/js"
)

func main() {
	done := make(chan struct{}, 0)

	js.Global().Set("encryptMsg", js.FuncOf(encryptMsg))

	<-done
}

func encryptMsg(this js.Value, args []js.Value) interface{} {
	var result map[string]interface{}

	if len(args) < 3 {
		result["error"] = "Invalid number of args"
		return result
	}

	otherPubDHBytes := make([]byte, args[0].Get("length").Int())
	js.CopyBytesToGo(otherPubDHBytes, args[0])

	msg := []byte(args[1].String())
	timestamp := []byte(args[2].String())

	masterSec, pubKey, err := generateMasterSecret(otherPubDHBytes, timestamp)
	if err != nil {
		result["error"] = err.Error()
		return result
	}
	result["pubKey"] = pubKey

	cipherText, err := encryptGCM(masterSec, msg)
	if err != nil {
		result["error"] = err.Error()
		return result
	}
	result["cipherText"] = cipherText

	return result
}

func generateMasterSecret(otherPubDHBytes, timestamp []byte) ([]byte, string, error) {
	crv := ecdh.P256()
	otherPubDH, err := crv.NewPublicKey(otherPubDHBytes)
	if err != nil {
		return nil, "", err
	}

	prvKey, err := crv.GenerateKey(rand.Reader)
	if err != nil {
		return nil, "", err
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
