import { z } from "zod";
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import '@/Components/Chatroom/Chatroom.css'

import { Button } from '@/Components/ui/button';
import { 
    Form,
    FormControl,
    FormField,
    FormItem
} from '@/Components/ui/form';
import { Input } from '@/Components/ui/input';
import { Message } from "@/Components/Message/Message";


export const formSchema = z.object({
    msg: z.string().min(1),
});

export const Chatroom = ({ chatroomId }) => {

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            msg: "",
        },
    });

    const sendMessage = async (values) => {

    };

    return(
        <div className="chatroom">
            <h1 className="text-center text-4xl font-bold mb-10 text-green-600">Chatroom</h1>
            <div className="flex-1 overflow-y-scroll p-5 box-border">
                <Message content={"dfsgfffffffffffffff ffj jfbjbfhdbdjhfb sdhbf sdhbf sdhbf sjhdbf sdjhbf sdjhf bsdjh fbfbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbdshbffffffff jsdhfb sd"} isSender={false}/>
                <Message content={"this is a test msg"} isSender={false}/>
                <Message content={"this is a test msg"} isSender={true}/>
                <Message content={"this is a test msg"} isSender={true}/>
                <Message content={"this is a test msg"} isSender={false}/>
                <Message content={"this is a test msg"} isSender={false}/>
                <Message content={"this is a test msg"} isSender={true}/>
                <Message content={"this is a test msg"} isSender={true}/>
                <Message content={"this is a test msg"} isSender={false}/>
                <Message content={"this is a test msg"} isSender={false}/>
                <Message content={"this is a test msg"} isSender={true}/>
                <Message content={"this is a test msg"} isSender={true}/>
                <Message content={"this is a test msg"} isSender={false}/>
                <Message content={"this is a test msg"} isSender={false}/>
                <Message content={"this is a test msg"} isSender={true}/>
                <Message content={"this is a test msg"} isSender={true}/>
                <Message content={"this is a test msg"} isSender={false}/>
                <Message content={"this is a test msg"} isSender={false}/>
                <Message content={"this is a test msg"} isSender={true}/>
                <Message content={"this is a test msg"} isSender={true}/>
                <Message content={"this is a test msg"} isSender={false}/>
                <Message content={"this is a test msg"} isSender={false}/>
                <Message content={"this is a test msg"} isSender={true}/>
                <Message content={"this is a test msg"} isSender={true}/>
            </div>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(sendMessage)} className="flex p-5 bg-white border-solid border-t border-gray-300">
                    <FormField
                        control={form.control}
                        name="msg"
                        render={({ field }) => (
                            <FormItem className="w-full">
                                <FormControl>
                                    <Input {...field} className="flex-1 text-base"/>
                                </FormControl>
                            </FormItem>
                        )}
                    />
                    <Button type="submit" className="text-base">Send</Button>
                </form>
            </Form>
        </div>
    )
};