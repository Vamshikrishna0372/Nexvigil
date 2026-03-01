import { LoadingState } from "./LoadingState";

export const LoadingOverlay = ({ text = "SYSTEM SYNCHRONIZING..." }: { text?: string }) => {
    return <LoadingState fullPage text={text} />;
};
