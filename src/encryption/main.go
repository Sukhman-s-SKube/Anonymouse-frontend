package main

import (
	"AnonyMouse/encryption/logic"

	"syscall/js"
)

func main() {
	done := make(chan struct{}, 0)

	js.Global().Set("encryptMsg", js.FuncOf(logic.EncryptMsg))
	js.Global().Set("decryptMsg", js.FuncOf(logic.DecryptMsg))
	js.Global().Set("generateDHKeys", js.FuncOf(logic.GenerateDHKeys))

	<-done
}
