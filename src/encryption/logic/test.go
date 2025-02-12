package main

import (
	"fmt"
	"encoding/base64"
	"encoding/hex"
	"crypto/ecdh"
	"crypto/rand"
	"hash"
	"io"
	"golang.org/x/crypto/hkdf"
)

func main() {
	// secret := []byte{0x00, 0x01, 0x02, 0x03} // this should be the root key?
	// salt := []byte("salt") // this should be some shared constant?
	// info := []byte("hskdf example") // this should be the dh output?

	// Generate three 128-bit derived keys.
	// keys := hkdf_output(2, 32, sha256.New, secret, nil, nil)
	// fmt.Println(keys)
	// fmt.Println()
	
	// for i := range keys {
	// 	fmt.Println(keys[i]) //byte array
	// 	fmt.Println(b16(keys[i])) //hex representation
	// 	fmt.Println(b64(keys[i])) //base64 representation
	// }

	alice := Person{name: "alice"}
	alice.keyGen()
	bob := Person{name: "bob"}
	bob.keyGen()

	fmt.Println(alice.name)
	fmt.Println(alice.IK)
	fmt.Println(alice.EK)
	fmt.Println(alice.SPK)
	fmt.Println(alice.OPK)

	fmt.Println()
	
	fmt.Println(bob.name)
	fmt.Println(bob.IK)
	fmt.Println(bob.EK)
	fmt.Println(bob.SPK)
	fmt.Println(bob.OPK)
	
	fmt.Println()

	fmt.Println("name:", alice.name == bob.name)
	fmt.Println("IK:", alice.IK.Equal(bob.IK))
	fmt.Println("EK:", alice.EK.Equal(bob.EK))
	fmt.Println("SPK:", alice.SPK.Equal(bob.SPK))
	fmt.Println("OPK:", alice.OPK.Equal(bob.OPK))
	
}

type Person struct{
	name string
	IK, EK, SPK, OPK *ecdh.PrivateKey
}

func (person *Person) keyGen(){
	curve := ecdh.X25519()
	person.IK, _ = curve.GenerateKey(rand.Reader)
	person.EK, _ = curve.GenerateKey(rand.Reader)
	person.SPK, _ = curve.GenerateKey(rand.Reader)
	person.OPK, _ = curve.GenerateKey(rand.Reader)
}

func hkdf_output (numKeys int, keySize int, hash func() hash.Hash, secret, salt, info []byte) [][]byte{

	hkdf_step :=hkdf.New(hash, secret, salt, info)

	var keys [][]byte
	for i := 0; i < numKeys; i++ {
		key := make([]byte, keySize)
		if _, err := io.ReadFull(hkdf_step, key); err != nil {
			panic(err)
		}
		keys = append(keys, key)
	}

	return keys
}

func b16(msg []byte) string {
	return hex.EncodeToString(msg)
}
func b64(msg []byte) string {
	return base64.StdEncoding.EncodeToString(msg)
}

