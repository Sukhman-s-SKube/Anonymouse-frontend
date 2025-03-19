package main

import (
	"AnonyMouse/encryption/logic"

	"syscall/js"
)

func main() {
	done := make(chan struct{}, 0)

	js.Global().Set("generateDHKeys", js.FuncOf(logic.GenerateDHKeys))

	js.Global().Set("genOnRegister", js.FuncOf(logic.GenOnRegister))
	js.Global().Set("x3DHSender", js.FuncOf(logic.X3DHSender))
	js.Global().Set("x3DHReceiver", js.FuncOf(logic.X3DHReceiver))
	js.Global().Set("senderFirst", js.FuncOf(logic.SenderFirst))
	js.Global().Set("sender", js.FuncOf(logic.Sender))
	js.Global().Set("receiverFirst", js.FuncOf(logic.ReceiverFirst))
	js.Global().Set("receiver", js.FuncOf(logic.Receiver))

	js.Global().Set("mKDecrypt", js.FuncOf(logic.MKDecrypt))

	<-done
}
