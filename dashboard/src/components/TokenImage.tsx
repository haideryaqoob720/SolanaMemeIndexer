import React, { useState, useEffect } from "react";

async function fetchImageUrl(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    if (!data.image) {
      throw new Error("No image property found in response");
    }

    return data.image;
  } catch (error) {
    console.error("Error fetching image URL:", error);
    throw error;
  }
}

// Define the styles with proper TypeScript types
const imageStyles: { [key: string]: React.CSSProperties } = {
  container: {
    position: "relative", // Required for absolute positioning of the icon
    display: "inline-block", // Ensure the container wraps the image
    width: "40px", // Match the image width
    height: "40px", // Match the image height
  },
  image: {
    width: "100%", // Fill the container
    height: "100%", // Fill the container
    borderRadius: "50%", // Circular image
  },
  iconContainer: {
    position: "absolute",
    bottom: 0, // Position at the bottom
    right: 0, // Position at the right
    // backgroundColor: "rgba(255, 255, 255)", // Optional: Add background for better visibility
    borderRadius: "50%", // Optional: Make the background circular
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transform: "translate(10%, 10%)", // Adjust icon position to overlap the image edge
    backgroundColor: "black",
    padding: "2px",
  },
};

const TokenImage = ({
  uri,
  name,
  isFromRaydium,
}: {
  uri: string;
  name: string;
  isFromRaydium: any;
}) => {
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    const loadImage = async () => {
      try {
        const url = await fetchImageUrl(uri);
        setImageUrl(url);
      } catch (error) {
        console.error("Error loading image:", error);
      }
    };

    if (uri) {
      loadImage();
    }
  }, [uri]);

  return (
    <div style={imageStyles.container}>
      <img src={imageUrl} alt={name} style={imageStyles.image} />
      {isFromRaydium !== undefined && (
        <div style={imageStyles.iconContainer}>
          {isFromRaydium ? (
            <img
              src={require("../assets/raydium.png")}
              width={"12"}
              height={"12"}
            />
          ) : (
            <img
              src={require("../assets/pumpfun.png")}
              width={"15"}
              height={"15"}
            />
          )}
          {/* Adjust size and color as needed */}
        </div>
      )}
    </div>
  );
};

const SolanaIcon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="17"
      height="17"
      viewBox="0 0 24 25"
    >
      <path
        fill="#f72585"
        d="M16.886 9.468a.47.47 0 0 1-.313.124H5.584c-.39 0-.587-.446-.317-.707l1.805-1.74a.46.46 0 0 1 .312-.129h11.032c.394 0 .587.45.313.712zm0 8.576a.47.47 0 0 1-.313.12H5.584c-.39 0-.587-.442-.317-.703l1.805-1.745a.45.45 0 0 1 .312-.124h11.032c.394 0 .587.446.313.707zm0-6.618a.47.47 0 0 0-.313-.12H5.584c-.39 0-.587.442-.317.703l1.805 1.745a.47.47 0 0 0 .312.124h11.032c.394 0 .587-.446.313-.707z"
      />
    </svg>
  );
};

const PumpkinLine = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="17"
    height="17"
    viewBox="0 0 24 24"
  >
    <g fill="none" fillRule="evenodd">
      <path d="M24 0v24H0V0h24ZM12.594 23.258l-.012.002l-.071.035l-.02.004l-.014-.004l-.071-.036c-.01-.003-.019 0-.024.006l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427c-.002-.01-.009-.017-.016-.018Zm.264-.113l-.014.002l-.184.093l-.01.01l-.003.011l.018.43l.005.012l.008.008l.201.092c.012.004.023 0 .029-.008l.004-.014l-.034-.614c-.003-.012-.01-.02-.02-.022Zm-.715.002a.023.023 0 0 0-.027.006l-.006.014l-.034.614c0 .012.007.02.017.024l.015-.002l.201-.093l.01-.008l.003-.011l.018-.43l-.003-.012l-.01-.01l-.184-.092Z"></path>
      <path
        fill="currentColor"
        d="M13.482 4.64a4.048 4.048 0 0 0-.286.58c.313.117.607.278.882.473c.138.098.272.204.4.32c.998-.723 2.176-1.11 3.411-.891c1.673.294 2.865 1.59 3.527 3.17c.666 1.59.864 3.6.5 5.663c-.364 2.064-1.237 3.884-2.407 5.15c-1.162 1.258-2.726 2.068-4.398 1.773a3.985 3.985 0 0 1-1.235-.437A3.513 3.513 0 0 1 12 21c-.688 0-1.32-.21-1.877-.559a3.93 3.93 0 0 1-1.234.437c-1.672.295-3.236-.515-4.398-1.772c-1.17-1.267-2.044-3.087-2.407-5.15c-.364-2.065-.166-4.074.5-5.664c.662-1.58 1.854-2.876 3.527-3.17c1.235-.218 2.413.168 3.41.89c.13-.115.263-.221.4-.32c.369-.26.772-.46 1.206-.577c.137-.52.371-1.055.64-1.505a4.35 4.35 0 0 1 .844-1.038C12.939 2.288 13.414 2 14 2a1 1 0 0 1 .039 2a.595.595 0 0 0-.118.084a2.358 2.358 0 0 0-.439.556ZM8.285 7.585c-.64-.445-1.27-.593-1.827-.495c-.775.137-1.527.775-2.029 1.973c-.497 1.188-.683 2.8-.376 4.544c.308 1.743 1.034 3.195 1.907 4.14c.882.955 1.807 1.297 2.582 1.16a1.62 1.62 0 0 0 .044-.007a8.162 8.162 0 0 1-.817-1.578C7.278 16.07 7 14.582 7 13c0-1.582.278-3.07.77-4.323a8.62 8.62 0 0 1 .515-1.091Zm2.793 11.09c-.524-.372-1.05-1.072-1.447-2.083C9.24 15.593 9 14.356 9 13c0-1.356.24-2.594.631-3.593c.397-1.01.923-1.71 1.447-2.082c.323-.228.637-.325.922-.325c.285 0 .6.096.922.325c.524.37 1.05 1.071 1.447 2.082c.392 1 .631 2.237.631 3.593c0 1.356-.24 2.594-.631 3.593c-.397 1.01-.923 1.71-1.447 2.082c-.323.229-.633.325-.922.325c-.289 0-.6-.096-.922-.325Zm4.336.225l.044.008c.775.137 1.7-.206 2.582-1.16c.873-.946 1.6-2.398 1.907-4.141c.307-1.744.121-3.357-.376-4.544c-.503-1.198-1.254-1.836-2.03-1.973c-.556-.098-1.187.05-1.827.495c.195.343.367.71.517 1.09C16.722 9.93 17 11.419 17 13c0 1.582-.278 3.07-.77 4.323a8.165 8.165 0 0 1-.816 1.578Z"
      ></path>
    </g>
  </svg>
);

export default TokenImage;
