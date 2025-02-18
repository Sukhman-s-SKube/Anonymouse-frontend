package main

import (
	"fmt"
	"encoding/base64"
	"encoding/hex"
	"crypto/ecdh"
	"crypto/rand"
	"crypto/sha256"
	// "crypto/ed25519"
	"bytes"
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

	alice.X3DH_initer(bob)
	bob.X3DH_recer(alice)

	fmt.Println(alice.name)
	fmt.Println(alice.IK)
	fmt.Println(alice.EK)
	fmt.Println(alice.SPK)
	fmt.Println(alice.OPK)
	fmt.Println(alice.dh1)
	fmt.Println(alice.dh2)
	fmt.Println(alice.dh3)
	fmt.Println(alice.dh4)
	for i := 0; i < len(alice.SK); i++ {
		fmt.Println(alice.SK[i])
	}

	fmt.Println()
	
	fmt.Println(bob.name)
	fmt.Println(bob.IK)
	fmt.Println(bob.EK)
	fmt.Println(bob.SPK)
	fmt.Println(bob.OPK)
	fmt.Println(bob.dh1)
	fmt.Println(bob.dh2)
	fmt.Println(bob.dh3)
	fmt.Println(bob.dh4)
	for i := 0; i < len(bob.SK); i++ {
		fmt.Println(bob.SK[i])
	}
	
	fmt.Println()

	fmt.Println("name:", alice.name == bob.name)
	fmt.Println("IK:", alice.IK.Equal(bob.IK))
	fmt.Println("EK:", alice.EK.Equal(bob.EK))
	fmt.Println("SPK:", alice.SPK.Equal(bob.SPK))
	fmt.Println("OPK:", alice.OPK.Equal(bob.OPK))
	fmt.Println("dh1:", bytes.Equal(alice.dh1, bob.dh1))
	fmt.Println("dh2:", bytes.Equal(alice.dh2, bob.dh2))
	fmt.Println("dh3:", bytes.Equal(alice.dh3, bob.dh3))
	fmt.Println("dh4:", bytes.Equal(alice.dh4, bob.dh4))
	fmt.Println("len:", len(alice.SK) == len(bob.SK))
	for i := 0; i < len(bob.SK); i++ {
		fmt.Println("SK#", i, bytes.Equal(alice.SK[i], bob.SK[i]))
	}
	
}

type Person struct{
	name string
	IK, EK, SPK, OPK *ecdh.PrivateKey
	prekey_signature []byte
	dh1, dh2, dh3, dh4 []byte
	SK [][]byte
}
const keySize = 32

func (person *Person) keyGen(){
	curve := ecdh.X25519()
	person.IK, _ = curve.GenerateKey(rand.Reader)
	person.EK, _ = curve.GenerateKey(rand.Reader)
	person.SPK, _ = curve.GenerateKey(rand.Reader)
	person.OPK, _ = curve.GenerateKey(rand.Reader)
}

func (person *Person) X3DH_initer(otherPerson Person){
	person.dh1, _ = person.IK.ECDH(otherPerson.SPK.PublicKey())
	person.dh2, _ = person.EK.ECDH(otherPerson.IK.PublicKey())
	person.dh3, _ = person.EK.ECDH(otherPerson.SPK.PublicKey())
	person.dh4, _ = person.EK.ECDH(otherPerson.OPK.PublicKey())
	person.SK = hkdf_output(1, 80, sha256.New, append(append(append(person.dh1, person.dh2...), person.dh3...), person.dh4...), nil, nil)
}

func (person *Person) X3DH_recer(otherPerson Person){
	person.dh1, _ = person.SPK.ECDH(otherPerson.IK.PublicKey())
	person.dh2, _ = person.IK.ECDH(otherPerson.EK.PublicKey())
	person.dh3, _ = person.SPK.ECDH(otherPerson.EK.PublicKey())
	person.dh4, _ = person.OPK.ECDH(otherPerson.EK.PublicKey())
	person.SK = hkdf_output(1, 80, sha256.New, append(append(append(person.dh1, person.dh2...), person.dh3...), person.dh4...), nil, nil)
}

func hkdf_output (numKeys int, outputSize int, hash func() hash.Hash, secret, salt, info []byte) [][]byte{

	hkdf_step := hkdf.New(hash, secret, salt, info)

	var keys [][]byte
	for i := 0; i < numKeys; i++ {
		key := make([]byte, outputSize)
		if _, err := io.ReadFull(hkdf_step, key); err != nil {
			panic(err)
		}
		keys = append(keys, key[:keySize])
		keys = append(keys, key[keySize:keySize*2])
		keys = append(keys, key[keySize*2:])
	}

	return keys
}

func b16(msg []byte) string {
	return hex.EncodeToString(msg)
}
func b64(msg []byte) string {
	return base64.StdEncoding.EncodeToString(msg)
}

