/**
 * Defines the {@link REPLACE_ME} functional component.
 * @module
 */
import React, { FC, ReactElement } from "react";
// import "./REPLACE_ME.scss";

/**
 * Props interface for {@link REPLACE_ME}.
 */
interface Props {
    /**
     * Replace with your props.
     */
    message: string;
}

/**
 * REPLACE ME with the definition of what this component does.
 * @param props - The component props.
 * @returns the REPLACE_ME component.
 */
export const REPLACE_ME: FC<Props> = (props: Props): ReactElement => {
    // TODO: The following is the order in which you should define section of the functional component:
    // - Determine state values based on provided props.
    // - Set the initial state.
    // - Define all needed functions.
    // - Define all useEffect triggers.
    // - Define returned JSX.

    // Returned JSX.
    return <div className="REPLACE_ME">{props.message}</div>;
};
