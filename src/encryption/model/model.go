package model

type DHGenRes struct {
	Err  string  `json:"err"`
	Keys []DHKey `json:"keys"`
}

type DHKey struct {
	PubKey  string `json:"pubKey"`
	PrivKey string `json:"privKey"`
}
