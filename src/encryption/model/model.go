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
	EK Key `json:"eK"`
	RK string `json:"rK"`
	SCK string `json:"sCK"`
	MK string `json:"mK"`
	DHK Key `json:"dhK"`
}

type X3DHRecPack struct {
	Err string  `json:"err"`
	PlainText string  `json:"plainText"`
	RK string `json:"rK"`
	RCK string `json:"rCK"`
	MK string `json:"mK"`
}

type SendPack struct {
	Err string  `json:"err"`
	CipherText string  `json:"cipherText"`
	RK string `json:"rK"`
	SCK string `json:"sCK"`
	MK string `json:"mK"`
	DHK Key `json:"dhK"`
}

type RecPack struct {
	Err string  `json:"err"`
	PlainText string  `json:"plainText"`
	RK string `json:"rK"`
	SCK string `json:"sCK"`
	MK string `json:"mK"`
}