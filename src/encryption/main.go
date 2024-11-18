package main

import "syscall/js"

func main() {
	done := make(chan struct{}, 0)

	js.Global().Set("test", js.FuncOf(test))

	<-done
}

func test(this js.Value, args []js.Value) interface{} {
	return js.Global().Call("alert", "Test")
}
