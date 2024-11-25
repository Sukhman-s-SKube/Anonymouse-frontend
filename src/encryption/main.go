package main

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/ecdh"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"syscall/js"
)

type DHGenRes struct {
	Err  string  `json:"err"`
	Keys []DHKey `json:"keys"`
}

type DHKey struct {
	Id      int    `json:"id"`
	PubKey  string `json:"pubKey"`
	PrivKey string `json:"privKey"`
}

func main() {
	done := make(chan struct{}, 0)

	js.Global().Set("encryptMsg", js.FuncOf(encryptMsg))
	js.Global().Set("decryptMsg", js.FuncOf(decryptMsg))
	js.Global().Set("generateDHKeys", js.FuncOf(generateDHKeys))

	<-done
}

// Paramters (3): otherPubDH string, msg string, timestamp string
func encryptMsg(this js.Value, args []js.Value) interface{} {
	result := make(map[string]interface{})
	result["error"] = ""

	if len(args) < 3 {
		result["error"] = "Invalid number of args"
		return result
	}

	otherPubDHBytes, err := hex.DecodeString(args[0].String())
	if err != nil {
		result["error"] = err.Error()
		return result
	}

	msg := []byte(args[1].String())
	timestamp := []byte(args[2].String())

	crv := ecdh.P256()
	prvKey, err := crv.GenerateKey(rand.Reader)
	if err != nil {
		result["error"] = err.Error()
		return result
	}

	masterSec, pubKey, err := generateMasterSecret(otherPubDHBytes, timestamp, prvKey)
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

// Paramters (4): otherPubDH string, myPrvDH string, cipherText string, timestamp string
func decryptMsg(this js.Value, args []js.Value) interface{} {
	result := make(map[string]interface{})
	result["error"] = ""

	if len(args) < 4 {
		result["error"] = "Invalid number of args"
		return result
	}

	otherPubDHBytes, err := hex.DecodeString(args[0].String())
	if err != nil {
		result["error"] = err.Error()
		return result
	}
	prvDHBytes, err := hex.DecodeString(args[1].String())
	if err != nil {
		result["error"] = err.Error()
		return result
	}

	cipherBytes, err := hex.DecodeString(args[2].String())
	if err != nil {
		result["error"] = err.Error()
		return result
	}

	timestamp := []byte(args[3].String())

	crv := ecdh.P256()
	prvDH, err := crv.NewPrivateKey(prvDHBytes)
	if err != nil {
		result["error"] = err.Error()
		return result
	}

	masterSecret, _, err := generateMasterSecret(otherPubDHBytes, timestamp, prvDH)
	if err != nil {
		result["error"] = err.Error()
		return result
	}

	plainText, err := decryptGCM(masterSecret, cipherBytes)
	if err != nil {
		result["error"] = err.Error()
		return result
	}

	result["msg"] = plainText

	return result
}

// Parameters (1): numKeys int
func generateDHKeys(this js.Value, args []js.Value) interface{} {
	var result DHGenRes

	if len(args) < 1 {
		result.Err = "Invalid number of args"
		res, _ := json.Marshal(result)
		return string(res)
	}

	numKeys := args[0].Int()

	crv := ecdh.P256()

	for i := 0; i < numKeys; i++ {
		prvKey, err := crv.GenerateKey(rand.Reader)
		if err != nil {
			result.Err = err.Error()
			res, _ := json.Marshal(result)
			return string(res)
		}

		pubKey := hex.EncodeToString(prvKey.PublicKey().Bytes())
		prvKeyStr := hex.EncodeToString(prvKey.Bytes())
		key := DHKey{i, pubKey, prvKeyStr}
		result.Keys = append(result.Keys, key)
		// result[strconv.Itoa(i)] = make(map[string]string)
	}

	res, _ := json.Marshal(result)
	return string(res)
}

func generateMasterSecret(otherPubDHBytes, timestamp []byte, prvKey *ecdh.PrivateKey) ([]byte, string, error) {
	crv := ecdh.P256()
	otherPubDH, err := crv.NewPublicKey(otherPubDHBytes)
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

	cipherBytes := gcm.Seal(nil, nonce, msg, nil)
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

	plainText := hex.EncodeToString(plainBytes)

	return plainText, nil
}
