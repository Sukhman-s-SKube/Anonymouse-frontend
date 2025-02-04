import axios from 'axios';
import { toast } from 'sonner';

export const getChatroomsRequest = async (soc, setChatrooms, apiroot) => {
    let response;
    try {
        response = await axios.get(`${apiroot}/chatroom`, {
            headers: {
                Authorization: sessionStorage.getItem("JWT"),
            },
        });
    } catch(err) {
        toast.error("Error getting chatrooms. Check Console");
        console.log(err);
        return;
    }

    setChatrooms(response.data);
    for (let room of response.data) {
        soc.emit("joinRoom", { "chatroomId": room._id });
    }
}