
export const Message = ({ content, isSender }) => {
    return(
        <div className={`flex my-2 mx-0 ${isSender ? "justify-end" : "justify-start"}`}>
            <div className={`inline-block max-w-[60%] py-1 px-5 rounded-2xl box-border text-white ${isSender ? "bg-green-600" : "bg-red-600"}`}>
                <p>{content}</p>
            </div>
        </div>
    )
};