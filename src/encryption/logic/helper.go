package logic

import (
	"AnonyMouse/encryption/model"
	"crypto/aes"
	"crypto/cipher"
	"crypto/ecdh"
	"crypto/rand"
	"crypto/sha256"
	"crypto/elliptic"
	"encoding/hex"
	"math/big"
	"errors"
	"hash"
	"io"
	"golang.org/x/crypto/hkdf"
)

var keySize = 32
func genOnRegister() (model.Key, model.Key, string, error){
	crv := ecdh.P521()

	ik, err := crv.GenerateKey(rand.Reader)
	if err != nil {
		return model.Key{}, model.Key{}, "", err
	} 

	sk, err := crv.GenerateKey(rand.Reader)
	if err != nil {
		return model.Key{}, model.Key{}, "", err
	} 

	sig := schnorrSign(ik, sk)
	
	return keyMarshler(ik), keyMarshler(sk), hex.EncodeToString(sig), nil
}

func ecdhSend(dhKeyB []bytes) ([]byte, model.Key, error){
	crv := ecdh.P521()

	dhKA, err := crv.GenerateKey(rand.Reader)
	if err != nil {
		return nil, model.Key{}, err
	}
	dhKB, err := crv.NewPublicKey(dhKeyB)
	if err != nil {
		return nil, model.Key{}, err
	}

	dhSK, err := dhKA.ECDH(dhKB)
	if err != nil {
		return nil, model.Key{}, err
	}

	return dhSK, keyMarshler(dhKA), nil
}

func ecdhRec(dhKeyA, dhKeyB []bytes) ([]byte, error){
	crv := ecdh.P521()

	dhKA, err := crv.NewPrivateKey(dhKeyA)
	if err != nil {
		return nil, err
	}
	dhKB, err := crv.NewPublicKey(dhKeyB)
	if err != nil {
		return nil, err
	}

	dhSK, err := dhKA.ECDH(dhKB)
	if err != nil {
		return nil, err
	}

	return dhSK, nil
}

func schnorrSign(ik, sck *ecdh.PrivateKey) []byte{
	ellipticP521 := elliptic.P521()
	IKx, IKy := elliptic.Unmarshal(ellipticP521, ik.PublicKey().Bytes()) 
	ScKx, ScKy := elliptic.Unmarshal(ellipticP521, sck.PublicKey().Bytes()) 
	
	c := sha256.Sum256(append(append(append(append(append(ScKx.Bytes(), ScKy.Bytes()...), IKx.Bytes()...), IKy.Bytes()...), ellipticP521.Params().Gx.Bytes()...), ellipticP521.Params().Gy.Bytes()...))

	xNum := new(big.Int)
	x := xNum.Mod(xNum.Add(xNum.Mul(new(big.Int).SetBytes(c[:]), new(big.Int).SetBytes(ik.Bytes())), new(big.Int).SetBytes(sck.Bytes())), ellipticP521.Params().N)
	
	return x.Bytes()
}

func schnorrVerify(IK, ScK, sig []byte) (bool, error){
	curveP521 := ecdh.P521()
	ellipticP521 := elliptic.P521()

	IKx, IKy := elliptic.Unmarshal(ellipticP521, IK) 
	ScKx, ScKy := elliptic.Unmarshal(ellipticP521, ScK) 

	c := sha256.Sum256(append(append(append(append(append(ScKx.Bytes(), ScKy.Bytes()...), IKx.Bytes()...), IKy.Bytes()...), ellipticP521.Params().Gx.Bytes()...), ellipticP521.Params().Gy.Bytes()...))
	cIKX, cIKY := ellipticP521.ScalarMult(IKx, IKy, c[:])
	sharedX, sharedY := ellipticP521.Add(cIKX, cIKY, ScKx, ScKy)
	shared := elliptic.Marshal(ellipticP521, sharedX, sharedY) 
	sharedFin, err := curveP521.NewPublicKey(shared)
	if err != nil{
		return false, err
	}

	sigGX, sigGY := ellipticP521.ScalarBaseMult(sig)
	sigG := elliptic.Marshal(ellipticP521, sigGX, sigGY) 
	sigGFin, err := curveP521.NewPublicKey(sigG)
	if err != nil{
		return false, err
	}
	return sharedFin.Equal(sigGFin) && sigGFin.Equal(sharedFin), nil
}

func x3dhSender(IKeyB, SKeyB, OPKeyB, ikeyA, timestamp []byte) ([]byte, model.Key, error){
	crv := ecdh.P521()

	ikA, err := crv.NewPrivateKey(ikeyA)
	if err != nil {
		return nil, model.Key{}, err
	}
	IKB, err := crv.NewPublicKey(IKeyB)
	if err != nil {
		return nil, model.Key{}, err
	}
	SKB, err := crv.NewPublicKey(SKeyB)
	if err != nil {
		return nil, model.Key{}, err
	}
	OPKB, err := crv.NewPublicKey(OPKeyB)
	if err != nil {
		return nil, model.Key{}, err
	}
	ekA, err := crv.GenerateKey(rand.Reader)
	if err != nil {
		return nil, model.Key{}, err
	}

	xdh1, err := ikA.ECDH(SKB.PublicKey())
	if err != nil {
		return nil, model.Key{}, err
	}
	xdh2, err := ekA.ECDH(IKB.PublicKey())
	if err != nil {
		return nil, model.Key{}, err
	}
	xdh3, err := ekA.ECDH(SKB.PublicKey())
	if err != nil {
		return nil, model.Key{}, err
	}
	xdh4, err := ekA.ECDH(OPKB.PublicKey())
	if err != nil {
		return nil, model.Key{}, err
	}

	shared, err := hkdfOutput(keySize, sha256.New, append(append(append(xdh1, xdh2...), xdh3...), xdh4...), timestamp, nil)
	if err != nil {
		return nil, model.Key{}, err
	}

	return shared, keyMarshler(ekA), nil
}

func x3dhReceiver(IKeyB, EKeyB, ikeyA, skeyA, opkeyA, timestamp []byte) ([]byte, error){
	crv := ecdh.P521()

	IKB, err := crv.NewPublicKey(IKeyB)
	if err != nil {
		return nil, err
	}
	EKB, err := crv.NewPublicKey(EKeyB)
	if err != nil {
		return nil, err
	}
	ikA, err := crv.NewPrivateKey(ikeyA)
	if err != nil {
		return nil, err
	}
	skA, err := crv.NewPrivateKey(skeyA)
	if err != nil {
		return nil, err
	}
	opkA, err := crv.NewPrivateKey(opkeyA)
	if err != nil {
		return nil, err
	}

	xdh1, err := skA.ECDH(IKB.PublicKey())
	if err != nil {
		return nil, err
	}
	xdh2, err := ikA.ECDH(EKB.PublicKey())
	if err != nil {
		return nil, err
	}
	xdh3, err := skA.ECDH(EKB.PublicKey())
	if err != nil {
		return nil, err
	}
	xdh4, err := opkA.ECDH(EKB.PublicKey())
	if err != nil {
		return nil, err
	}

	shared, err := hkdfOutput(keySize, sha256.New, append(append(append(xdh1, xdh2...), xdh3...), xdh4...), timestamp, nil)
	if err != nil {
		return nil, err
	}

	return shared, nil
}

func keyMarshler(privKey *ecdh.PrivateKey) model.Key {
	pubKeyStr := hex.EncodeToString(privKey.PublicKey().Bytes())
	privKeyStr := hex.EncodeToString(privKey.Bytes())

	key := model.Key{PubKey: pubKeyStr, PrivKey: privKeyStr}

	return key
}

func ratchetNext(secret, salt []byte) ([]byte, []byte, error) {
	output, err := hkdfOutput(keySize*2, sha256.New, secret, salt, nil)
	if err != nil {
		return nil, nil, err
	}
	return output[:keySize], output[keySize:], nil
}

func hkdfOutput(outputSize int, hash func() hash.Hash, secret, salt, info []byte) ([]byte, error){
	hkdf_step := hkdf.New(hash, secret, salt, info)

	key := make([]byte, outputSize)
	if _, err := io.ReadFull(hkdf_step, key); err != nil {
		return nil, err
	}

	return key, nil
}
// func generateKeyObj() (*ecdh.PrivateKey, error) {
// 	crv := ecdh.P521()
// 	privKey, err := crv.GenerateKey(rand.Reader)
// 	if err != nil {
// 		return &ecdh.PrivateKey{}, err
// 	}

// 	return privKey, nil
// }



func getMasterSecret(otherPubDHBytes, timestamp []byte, prvKey *ecdh.PrivateKey) ([]byte, string, error) {
	crv := ecdh.P521()
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

func generateKeyPair() (model.Key, error) {
	crv := ecdh.P521()
	privKey, err := crv.GenerateKey(rand.Reader)
	if err != nil {
		return model.Key{}, err
	}

	pubKey := hex.EncodeToString(privKey.PublicKey().Bytes())
	privKeyStr := hex.EncodeToString(privKey.Bytes())

	key := model.Key{PubKey: pubKey, PrivKey: privKeyStr}

	return key, nil
}