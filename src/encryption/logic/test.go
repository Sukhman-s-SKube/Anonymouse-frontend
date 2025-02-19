package main

import (
	"fmt"
	"encoding/base64"
	"encoding/hex"
	"crypto/ecdh"
	"crypto/rand"
	"crypto/sha256"
	"crypto/aes"
	"crypto/cipher"
	// "crypto/ed25519/internal/edwards25519/edwards25519"
	// "crypto/ed25519"
	"bytes"
	"hash"
	"io"
	"golang.org/x/crypto/hkdf"
)

func main() {
	/* code below used as refrence dont uncomment
	secret := []byte{0x00, 0x01, 0x02, 0x03} // this should be the root key?
	salt := []byte("salt") // this should be some shared constant?
	info := []byte("hskdf example") // this should be the dh output?

	Generate three 128-bit derived keys.
	keys := hkdf_output(2, 32, sha256.New, secret, nil, nil)
	fmt.Println(keys)
	fmt.Println()
	
	for i := range keys {
		fmt.Println(keys[i]) //byte array
		fmt.Println(b16(keys[i])) //hex representation
		fmt.Println(b64(keys[i])) //base64 representation
	}
	*/

	alice := Person{name: "alice"}
	alice.key_gen()
	bob := Person{name: "bob"}
	bob.key_gen()

	alice.X3DH_send(bob)
	bob.X3DH_recv(alice)

	// print_X3DH_diff(alice, bob)

	alice.root.state = alice.SK
	alice.root_ratchet_send()
	
	bob.root.state = bob.SK
	bob.root_ratchet_recv()

	// fmt.Println()
	// print_ratchet_diff(alice, bob)
	
	// alice.send.chain_ratchet_next(alice.send.state)
	// bob.recv.chain_ratchet_next(bob.recv.state)

	// fmt.Println()
	// print_ratchet_diff(alice, bob)

//working off of the SK from X3DH
//alice send
	alice_ciphertext1 := alice.sending("hello")
//bob recieve
	bob_plaintext1 := bob.recving(alice_ciphertext1)

//real dh ratchet tick
//bob send
	bob.otherDH = alice.myDH.PublicKey()
	bob.dh_ratchet_send()
	bob_ciphertext1 := bob.sending("world")
//alice recieve
	alice.dh_ratchet_recv(bob.myDH.PublicKey())
	alice_plaintext1 := alice.recving(bob_ciphertext1)

//same dh ratchet, no tick
//bob send
	bob_ciphertext2 := bob.sending("marco")
//alice recieves
	alice_plaintext2 := alice.recving(bob_ciphertext2)

	fmt.Println("Alice:\t", bob_plaintext1)
	fmt.Println("Bob:\t", alice_plaintext1)
	fmt.Println("Bob:\t", alice_plaintext2)
}





var keySize = 32
type Ratchet struct{
	state []byte
	next []byte
	iv []byte
}
type Person struct{
	name string

	IK, EK, SPK, OPK *ecdh.PrivateKey
	prekey_signature []byte
	Xdh1, Xdh2, Xdh3, Xdh4 []byte
	SK []byte

	root Ratchet
	send Ratchet
	recv Ratchet

	myDH *ecdh.PrivateKey
	otherDH *ecdh.PublicKey
}


func (person *Person) key_gen(){
	curve := ecdh.X25519()
	person.IK, _ = curve.GenerateKey(rand.Reader)
	person.EK, _ = curve.GenerateKey(rand.Reader)
	person.SPK, _ = curve.GenerateKey(rand.Reader)
	person.OPK, _ = curve.GenerateKey(rand.Reader)
	person.myDH, _ = curve.GenerateKey(rand.Reader)
}

func (person *Person) X3DH_send(otherPerson Person){
	person.Xdh1, _ = person.IK.ECDH(otherPerson.SPK.PublicKey())
	person.Xdh2, _ = person.EK.ECDH(otherPerson.IK.PublicKey())
	person.Xdh3, _ = person.EK.ECDH(otherPerson.SPK.PublicKey())
	person.Xdh4, _ = person.EK.ECDH(otherPerson.OPK.PublicKey())
	person.SK = hkdf_output(1, 32, sha256.New, append(append(append(person.Xdh1, person.Xdh2...), person.Xdh3...), person.Xdh4...), nil, nil)
}

func (person *Person) X3DH_recv(otherPerson Person){
	person.Xdh1, _ = person.SPK.ECDH(otherPerson.IK.PublicKey())
	person.Xdh3, _ = person.SPK.ECDH(otherPerson.EK.PublicKey())
	person.Xdh2, _ = person.IK.ECDH(otherPerson.EK.PublicKey())
	person.Xdh4, _ = person.OPK.ECDH(otherPerson.EK.PublicKey())
	person.SK = hkdf_output(1, 32, sha256.New, append(append(append(person.Xdh1, person.Xdh2...), person.Xdh3...), person.Xdh4...), nil, nil)
}


func (person *Person) root_ratchet_send(){
	person.root.root_ratchet_next(person.root.state)
	person.send.state = person.root.next
}














func hkdf_output (numKeys int, outputSize int, hash func() hash.Hash, secret, salt, info []byte) []byte{

	hkdf_step := hkdf.New(hash, secret, salt, info)

	var keys []byte
	for i := 0; i < numKeys; i++ {
		key := make([]byte, outputSize)
		if _, err := io.ReadFull(hkdf_step, key); err != nil {
			panic(err)
		}

		keys = key
	}
	return keys
}






func b16(msg []byte) string {
	return hex.EncodeToString(msg)
}
func b64(msg []byte) string {
	return base64.StdEncoding.EncodeToString(msg)
}



/* Code below is all wrong */

// const p_expo float64 = 255
// var p float64 = math.Pow(2, p_expo) - 19


// func calculate_key_pair(k) {
// 	Ey, Es := k*convert_mont(9)
// 	Ay := Ey
// 	if Es == 1:
// 		a := math.Mod(-k, q)
// 	else:
// 		a := math.Mod(k, q)
// 	return Ay, 0, a
// }
// func convert_mont(u ecdh.PublicKey.Bytes) (*edwards25519.Point, error){
// 	u_masked, err := (&field.Element{}).SetBytes(u)
// 	if err != nil {
// 		return nil, err
// 	}

// 	// y = (u - 1)/(u + 1)
// 	a := new(field.Element).Subtract(u_masked, one)
// 	b := new(field.Element).Add(u_masked, one)
// 	y := new(field.Element).Multiply(a, b.Invert(b)).Bytes()

// 	// Set sign to 0
// 	y[31] &= 0x7F

// 	return (&edwards25519.Point{}).SetBytes(y)
// }
// func u_to_y(u) float64{
// 	return (u - 1) * math.Mod(math.Pow((u + 1), (p - 2)), p)
// }
