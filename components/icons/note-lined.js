const NoteLined = (props) => (
  <svg
    width={28}
    height={42}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-inherit"
    {...props}
  >
    <g clipPath="url(#a)">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16.14 39.921c3.396-1.82 5.205-5.114 4.092-7.593-1.187-2.644-5.267-3.39-9.106-1.665-3.84 1.724-5.993 5.27-4.805 7.913 1.187 2.643 5.267 3.39 9.106 1.665.24-.108.487-.199.713-.32Z"
        fill="currentColor"
      />
      <path d="M19.78 33.587V0" stroke="currentColor" strokeWidth={1.5} />
    </g>
    <path stroke="currentColor" d="M0 35.5h28" />
    <defs>
      <clipPath id="a">
        <path fill="#fff" transform="translate(6)" d="M0 0h14.566v41.17H0z" />
      </clipPath>
    </defs>
  </svg>
)

export default NoteLined;
