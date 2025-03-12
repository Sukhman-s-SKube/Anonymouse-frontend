package logic

// import (
// 	"fmt"
// 	"crypto/ecdh"
// 	"crypto/rand"
// 	"crypto/sha256"
// 	"crypto/aes"
// 	"crypto/cipher"
// 	"crypto/elliptic"
// 	"math/big"
// 	"bytes"
// 	"hash"
// 	"io"
// 	"golang.org/x/crypto/hkdf"
// )

// func main() {

// 	alice := Person{name: "alice"}
// 	alice.key_gen()
// 	bob := Person{name: "bob"}
// 	bob.key_gen()

// 	alice.X3DH_send(bob)
// 	bob.X3DH_recv(alice)

// 	// print_X3DH_diff(alice, bob)

// 	alice.root.state = alice.SK
// 	alice.root_ratchet_send()

// 	bob.root.state = bob.SK
// 	bob.root_ratchet_recv()

// 	// fmt.Println()
// 	// print_ratchet_diff(alice, bob)

// 	// alice.send.chain_ratchet_next(alice.send.state)
// 	// bob.recv.chain_ratchet_next(bob.recv.state)

// 	// fmt.Println()
// 	// print_ratchet_diff(alice, bob)

// //working off of the SK from X3DH
// //alice send
// 	alice_ciphertext1 := alice.sending("hello")
// 	// alice.AD = nil
// 	//bob receive
// 	bob_plaintext1 := bob.recving(alice_ciphertext1)
// 	// bob.AD = nil

// //real dh ratchet tick
// //bob send
// 	bob.otherDH = alice.myDH.PublicKey()
// 	bob.dh_ratchet_send()
// 	bob_ciphertext1 := bob.sending("world")
// //alice receive
// 	alice.dh_ratchet_recv(bob.myDH.PublicKey())
// 	alice_plaintext1 := alice.recving(bob_ciphertext1)

// //same dh ratchet, no tick
// //bob send
// 	bob_ciphertext2 := bob.sending("marco")
// //alice receives
// 	alice_plaintext2 := alice.recving(bob_ciphertext2)

// //alice third
// 	alice.otherDH = bob.myDH.PublicKey()
// 	alice.dh_ratchet_send()
// 	alice_ciphertext2 := alice.sending("polo")

// 	bob.dh_ratchet_recv(alice.myDH.PublicKey())
// 	bob_plaintext2 := bob.recving(alice_ciphertext2)

// 	fmt.Println("Alice:\t", bob_plaintext1)
// 	fmt.Println("Bob:\t", alice_plaintext1)
// 	fmt.Println("Bob:\t", alice_plaintext2)
// 	fmt.Println("Alice:\t", bob_plaintext2)
// }

// func print_X3DH_diff(alice, bob Person){
// 	fmt.Println(alice.name)
// 	fmt.Println(alice.IK)
// 	fmt.Println(alice.EK)
// 	fmt.Println(alice.ScK)
// 	fmt.Println(alice.OPK)
// 	fmt.Println(alice.Xdh1)
// 	fmt.Println(alice.Xdh2)
// 	fmt.Println(alice.Xdh3)
// 	fmt.Println(alice.Xdh4)
// 	fmt.Println(alice.SK)

// 	fmt.Println()

// 	fmt.Println(bob.name)
// 	fmt.Println(bob.IK)
// 	fmt.Println(bob.EK)
// 	fmt.Println(bob.ScK)
// 	fmt.Println(bob.OPK)
// 	fmt.Println(bob.Xdh1)
// 	fmt.Println(bob.Xdh2)
// 	fmt.Println(bob.Xdh3)
// 	fmt.Println(bob.Xdh4)
// 	fmt.Println(bob.SK)

// 	fmt.Println()

// 	fmt.Println("name:", alice.name == bob.name)
// 	fmt.Println("IK:", alice.IK.Equal(bob.IK))
// 	fmt.Println("EK:", alice.EK.Equal(bob.EK))
// 	fmt.Println("ScK:", alice.ScK.Equal(bob.ScK))
// 	fmt.Println("OPK:", alice.OPK.Equal(bob.OPK))
// 	fmt.Println("Xdh1:", bytes.Equal(alice.Xdh1, bob.Xdh1))
// 	fmt.Println("Xdh2:", bytes.Equal(alice.Xdh2, bob.Xdh2))
// 	fmt.Println("Xdh3:", bytes.Equal(alice.Xdh3, bob.Xdh3))
// 	fmt.Println("Xdh4:", bytes.Equal(alice.Xdh4, bob.Xdh4))
// 	fmt.Println("len:", len(alice.SK) == len(bob.SK))
// 	fmt.Println("SK:", bytes.Equal(alice.SK, bob.SK))
// }

// func print_ratchet_diff(alice, bob Person){
// 	fmt.Println(alice.name)
// 	fmt.Println(alice.root.state)
// 	fmt.Println(alice.send.state)
// 	fmt.Println(alice.send.next)
// 	fmt.Println(alice.recv.state)
// 	fmt.Println(alice.recv.next)

// 	fmt.Println()

// 	fmt.Println(bob.name)
// 	fmt.Println(bob.root.state)
// 	fmt.Println(bob.recv.state)
// 	fmt.Println(bob.recv.next)
// 	fmt.Println(bob.send.state)
// 	fmt.Println(bob.send.next)

// 	fmt.Println()

// 	fmt.Println("name:", alice.name == bob.name)
// 	fmt.Println("root:", bytes.Equal(alice.root.state, bob.root.state))
// 	fmt.Println("alice-send-chain -> bob-recv-chain:", bytes.Equal(alice.send.state, bob.recv.state))
// 	fmt.Println("alice-send-message -> bob-recv-message:", bytes.Equal(alice.send.next, bob.recv.next))
// 	fmt.Println("alice-recv-chain -> bob-send-chain:", bytes.Equal(alice.recv.state, bob.send.state))
// 	fmt.Println("alice-recv-message -> bob-send-message:", bytes.Equal(alice.recv.next, bob.send.next))
// }

// var keySize = 32
// type Ratchet struct{
// 	state []byte
// 	next []byte
// }
// type Person struct{
// 	name string

// 	IK, EK, OPK *ecdh.PrivateKey
// 	Xdh1, Xdh2, Xdh3, Xdh4, SK []byte
// 	// AD []byte

// 	ScK *ecdh.PrivateKey
// 	SchnorrSig []byte

// 	root Ratchet
// 	send Ratchet
// 	recv Ratchet

// 	myDH *ecdh.PrivateKey
// 	otherDH *ecdh.PublicKey
// }

// func (person *Person) key_gen(){
// 	curveP521 := ecdh.P521()
// 	person.IK, _ = curveP521.GenerateKey(rand.Reader)
// 	person.EK, _ = curveP521.GenerateKey(rand.Reader)
// 	person.ScK, _ = curveP521.GenerateKey(rand.Reader)
// 	person.OPK, _ = curveP521.GenerateKey(rand.Reader)
// 	person.myDH, _ = curveP521.GenerateKey(rand.Reader)

// 	person.SchnorrSig = schnorr_sign(person.IK, person.ScK)
// }

// func schnorr_sign(ik, sck *ecdh.PrivateKey) []byte{
// 	ellipticP521 := elliptic.P521()
// 	IKx, IKy := elliptic.Unmarshal(ellipticP521, ik.PublicKey().Bytes())
// 	ScKx, ScKy := elliptic.Unmarshal(ellipticP521, sck.PublicKey().Bytes())

// 	c := sha256.Sum256(append(append(append(append(append(ScKx.Bytes(), ScKy.Bytes()...), IKx.Bytes()...), IKy.Bytes()...), ellipticP521.Params().Gx.Bytes()...), ellipticP521.Params().Gy.Bytes()...))

// 	xNum := new(big.Int)
// 	x := xNum.Mod(xNum.Add(xNum.Mul(new(big.Int).SetBytes(c[:]), new(big.Int).SetBytes(ik.Bytes())), new(big.Int).SetBytes(sck.Bytes())), ellipticP521.Params().N)

// 	return x.Bytes()
// }

// func (person *Person) X3DH_send(otherPerson Person){
// 	if !schnorr_verify(otherPerson.IK.PublicKey().Bytes(), otherPerson.ScK.PublicKey().Bytes(), otherPerson.SchnorrSig){
// 		fmt.Println("schnorr verify failed")
// 	}
// 	person.Xdh1, _ = person.IK.ECDH(otherPerson.ScK.PublicKey())
// 	person.Xdh2, _ = person.EK.ECDH(otherPerson.IK.PublicKey())
// 	person.Xdh3, _ = person.EK.ECDH(otherPerson.ScK.PublicKey())
// 	person.Xdh4, _ = person.EK.ECDH(otherPerson.OPK.PublicKey())
// 	person.SK = hkdf_output(keySize, sha256.New, append(append(append(person.Xdh1, person.Xdh2...), person.Xdh3...), person.Xdh4...), nil, nil)
// 	// person.AD = append(person.IK.PublicKey().Bytes(), otherPerson.IK.PublicKey().Bytes()...)
// }

// func (person *Person) X3DH_recv(otherPerson Person){
// 	if !schnorr_verify(otherPerson.IK.PublicKey().Bytes(), otherPerson.ScK.PublicKey().Bytes(), otherPerson.SchnorrSig){
// 		fmt.Println("schnorr verify failed")
// 	}
// 	person.Xdh1, _ = person.ScK.ECDH(otherPerson.IK.PublicKey())
// 	person.Xdh2, _ = person.IK.ECDH(otherPerson.EK.PublicKey())
// 	person.Xdh3, _ = person.ScK.ECDH(otherPerson.EK.PublicKey())
// 	person.Xdh4, _ = person.OPK.ECDH(otherPerson.EK.PublicKey())
// 	person.SK = hkdf_output(keySize, sha256.New, append(append(append(person.Xdh1, person.Xdh2...), person.Xdh3...), person.Xdh4...), nil, nil)
// 	// person.AD = append(otherPerson.IK.PublicKey().Bytes(), person.IK.PublicKey().Bytes()...)
// }

// func schnorr_verify(IK, ScK, sig []byte) bool{
// 	curveP521 := ecdh.P521()
// 	ellipticP521 := elliptic.P521()

// 	IKx, IKy := elliptic.Unmarshal(ellipticP521, IK)
// 	ScKx, ScKy := elliptic.Unmarshal(ellipticP521, ScK)

// 	c := sha256.Sum256(append(append(append(append(append(ScKx.Bytes(), ScKy.Bytes()...), IKx.Bytes()...), IKy.Bytes()...), ellipticP521.Params().Gx.Bytes()...), ellipticP521.Params().Gy.Bytes()...))
// 	cIKX, cIKY := ellipticP521.ScalarMult(IKx, IKy, c[:])
// 	sharedX, sharedY := ellipticP521.Add(cIKX, cIKY, ScKx, ScKy)
// 	shared := elliptic.Marshal(ellipticP521, sharedX, sharedY)
// 	sharedFin, err := curveP521.NewPublicKey(shared)
// 	if err != nil{
// 		fmt.Println("err", err)
// 		return false
// 	}

// 	sigGX, sigGY := ellipticP521.ScalarBaseMult(sig)
// 	sigG := elliptic.Marshal(ellipticP521, sigGX, sigGY)
// 	sigGFin, err := curveP521.NewPublicKey(sigG)
// 	if err != nil{
// 		fmt.Println("err", err)
// 		return false
// 	}
// 	return sharedFin.Equal(sigGFin) && sigGFin.Equal(sharedFin)
// }

// func (person *Person) root_ratchet_send(){
// 	person.root.ratchet_next(person.root.state)
// 	person.send.state = person.root.next
// }

// func (person *Person) root_ratchet_recv(){
// 	person.root.ratchet_next(person.root.state)
// 	person.recv.state = person.root.next
// }

// func (person *Person) dh_ratchet_send(){
// 	curve := ecdh.P521()
// 	person.myDH, _ = curve.GenerateKey(rand.Reader)
// 	dhs, _ := person.myDH.ECDH(person.otherDH)
// 	person.root.ratchet_next(append(person.root.state, dhs...))
// 	person.send.state = person.root.next
// }

// func (person *Person) dh_ratchet_recv(dhKey *ecdh.PublicKey){
// 	person.otherDH = dhKey
// 	dhs, _ := person.myDH.ECDH(person.otherDH)
// 	person.root.ratchet_next(append(person.root.state, dhs...))
// 	person.recv.state = person.root.next
// }

// func (person *Person) sending(msg string) []byte {
// 	person.send.ratchet_next(person.send.state)
// 	return encryptGCM(person.send.next, []byte(msg))
// }

// func (person *Person) recving(cipherText []byte) string {
// 	person.recv.ratchet_next(person.recv.state)
// 	return decryptGCM(person.recv.next, cipherText)

// }

// func (ratchet *Ratchet) ratchet_next(secret []byte) {
// 	output := hkdf_output(keySize*2, sha256.New, secret, nil, nil)
// 	ratchet.state = output[:keySize]
// 	ratchet.next = output[keySize:]
// }

// func hkdf_output(outputSize int, hash func() hash.Hash, secret, salt, info []byte) []byte{
// 	hkdf_step := hkdf.New(hash, secret, salt, info)

// 	key := make([]byte, outputSize)
// 	if _, err := io.ReadFull(hkdf_step, key); err != nil {
// 		panic(err)
// 	}

// 	return key
// }

// func encryptGCM(key, msg []byte) []byte {
// 	block, err := aes.NewCipher(key)
// 	if err != nil {
// 		return nil
// 	}

// 	gcm, err := cipher.NewGCM(block)
// 	if err != nil {
// 		return nil
// 	}

// 	nonce := make([]byte, gcm.NonceSize())
// 	if _, err := rand.Read(nonce); err != nil {
// 		return nil
// 	}

// 	cipherBytes := gcm.Seal(nonce, nonce, msg, nil)

// 	return cipherBytes
// }

// func decryptGCM(key, cipherBytes []byte) string {

// 	block, err := aes.NewCipher(key)
// 	if err != nil {
// 		return "err"
// 	}

// 	gcm, err := cipher.NewGCM(block)
// 	if err != nil {
// 		return "err"
// 	}
// 	if len(cipherBytes) < gcm.NonceSize() {
// 		return "err"
// 	}

// 	nonce := cipherBytes[:gcm.NonceSize()]
// 	cipherBytes = cipherBytes[gcm.NonceSize():]

// 	plainBytes, err := gcm.Open(nil, nonce, cipherBytes, nil)
// 	if err != nil {
// 		return "err"
// 	}

// 	return string(plainBytes)
// }
