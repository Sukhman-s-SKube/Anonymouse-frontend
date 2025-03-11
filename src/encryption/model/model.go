package model

type KeysGenRes struct {
	Err  string  `json:"err"`
	Keys []Key `json:"keys"`
}

type Key struct {
	PubKey  string `json:"pubKey"`
	PrivKey string `json:"privKey"`
}

type RegPack struct {
	Err string  `json:"err"`
	IK Key `json:"iK"`
	SK Key `json:"sK"`
	Sig string `json:"sig"`
}

type X3DHSendPack struct {
	Err string  `json:"err"`
	CipherText string  `json:"cipherText"`
	EK string `json:"eK"`
	RK string `json:"rK"`
	SCK string `json:"sCK"`
	MK string `json:"mK"`
	DHK Key `json:"dhK"`
}

type SendFirstPack struct {
	Err string  `json:"err"`
	CipherText string  `json:"cipherText"`
	RK string `json:"rK"`
	SCK string `json:"sCK"`
	MK string `json:"mK"`
	DHK Key `json:"dhK"`
}

type SendPack struct {
	Err string  `json:"err"`
	CipherText string  `json:"cipherText"`
	SCK string `json:"sCK"`
	MK string `json:"mK"`
}

type X3DHRecPack struct {
	Err string  `json:"err"`
	PlainText string  `json:"plainText"`
	RK string `json:"rK"`
	RCK string `json:"rCK"`
}

type RecFirstPack struct {
	Err string  `json:"err"`
	PlainText string  `json:"plainText"`
	RK string `json:"rK"`
	RCK string `json:"rCK"`
}

type RecPack struct {
	Err string  `json:"err"`
	PlainText string  `json:"plainText"`
	RCK string `json:"rCK"`
}

type DecMSG struct {
	Err string  `json:"err"`
	PlainText string  `json:"plainText"`
}