package logic

import (
	"AnonyMouse/encryption/model"
	"crypto/ecdh"
	"encoding/hex"
	"encoding/json"
	"syscall/js"
)

// Paramters (3): otherPubDH string, msg string, timestamp string
func EncryptMsg(this js.Value, args []js.Value) interface{} {
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

	masterSec, pubKey, err := getMasterSecret(otherPubDHBytes, timestamp, nil)
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
func DecryptMsg(this js.Value, args []js.Value) interface{} {
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

	masterSecret, _, err := getMasterSecret(otherPubDHBytes, timestamp, prvDH)
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
func GenerateDHKeys(this js.Value, args []js.Value) interface{} {
	var result model.DHGenRes

	if len(args) < 1 {
		result.Err = "Invalid number of args"
		res, _ := json.Marshal(result)
		return string(res)
	}

	numKeys := args[0].Int()

	for i := 0; i < numKeys; i++ {
		key, err := generateKeyPair(i)
		if err != nil {
			result.Err = err.Error()
			res, _ := json.Marshal(result)
			return string(res)
		}
		result.Keys = append(result.Keys, key)
	}

	res, _ := json.Marshal(result)
	return string(res)
}
