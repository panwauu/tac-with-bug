<template>
  <div>
    <!-- eslint-disable -->
    <svg
      v-if="side === 'right'"
      preserveAspectRatio="xMaxYMax"
      height="100%"
      fill="none"
      viewBox="0 0 322 280"
    >
      <g clip-path="url(#clip0)">
        <path
          d="M151 148L151 179L115 223"
          stroke="#8BC63E"
          stroke-width="20"
        />
        <circle
          cx="101"
          cy="236"
          r="25"
          stroke="#8BC63E"
          stroke-width="20"
        />
        <path
          d="M151 132L151 101L115 57"
          stroke="#0095DA"
          stroke-width="20"
        />
        <circle
          r="25"
          transform="matrix(1 0 0 -1 101 44)"
          stroke="#0095DA"
          stroke-width="20"
        />
        <path
          d="M161 140L51 139"
          stroke="#E7E8EA"
          stroke-width="20"
        />
        <circle
          r="25"
          transform="matrix(1 0 0 -1 35 139)"
          stroke="#E7E8EA"
          stroke-width="20"
        />
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M241.209 0.920009C241.457 28.2473 234.629 55.9976 219.976 81.3776C205.322 106.757 184.704 126.546 160.914 139.995C160.666 112.668 167.494 84.9174 182.148 59.5375C196.801 34.1576 217.419 14.3689 241.209 0.920009Z"
          fill="#EF3F23"
        />
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M241.515 278.981C217.725 265.532 197.106 245.743 182.453 220.363C167.8 194.983 160.972 167.233 161.22 139.905C185.01 153.354 205.628 173.143 220.281 198.523C234.934 223.903 241.763 251.653 241.515 278.981Z"
          fill="#002B54"
        />
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M321.482 139.995C297.94 153.874 270.493 161.835 241.187 161.835C211.88 161.835 184.434 153.874 160.892 139.995C184.434 126.117 211.88 118.155 241.187 118.155C270.493 118.155 297.94 126.117 321.482 139.995Z"
          fill="#E7E8EA"
        />
      </g>
    </svg>

    <svg
      v-if="side === 'left'"
      preserveAspectRatio="xMaxYMax"
      height="100%"
      fill="none"
      viewBox="0 0 322 280"
    >
      <g clip-path="url(#clip0)">
        <path
          d="M171 148L171 179L207 223"
          stroke="#002B54"
          stroke-width="20"
        />
        <circle
          r="25"
          transform="matrix(-1 0 0 1 221 236)"
          stroke="#002B54"
          stroke-width="20"
        />
        <path
          d="M171 132L171 101L207 57"
          stroke="#EF3F23"
          stroke-width="20"
        />
        <circle
          cx="221"
          cy="44"
          r="25"
          transform="rotate(180 221 44)"
          stroke="#EF3F23"
          stroke-width="20"
        />
        <path
          d="M161 140L271 139"
          stroke="#E7E8EA"
          stroke-width="20"
        />
        <circle
          cx="287"
          cy="139"
          r="25"
          transform="rotate(180 287 139)"
          stroke="#E7E8EA"
          stroke-width="20"
        />
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M80.791 0.92002C80.543 28.2473 87.3713 55.9977 102.024 81.3776C116.678 106.758 137.296 126.546 161.086 139.995C161.334 112.668 154.506 84.9175 139.852 59.5375C125.199 34.1576 104.581 14.3689 80.791 0.92002Z"
          fill="#0095DA"
        />
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M80.4852 278.981C104.275 265.532 124.894 245.743 139.547 220.363C154.2 194.983 161.028 167.233 160.78 139.905C136.99 153.354 116.372 173.143 101.719 198.523C87.0656 223.903 80.2373 251.653 80.4852 278.981Z"
          fill="#8BC63E"
        />
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M0.51828 139.995C24.0604 153.874 51.5071 161.835 80.8133 161.835C110.12 161.835 137.566 153.874 161.108 139.995C137.566 126.117 110.12 118.155 80.8133 118.155C51.5071 118.155 24.0604 126.117 0.51828 139.995Z"
          fill="#E7E8EA"
        />
      </g>
    </svg>

    <svg
      v-if="side === 'both'"
      preserveAspectRatio="xMaxYMax"
      height="100%"
      fill="none"
      viewBox="0 0 321 266"
    >
      <path
        d="M151 143L151 174L115 218"
        stroke="#8BC63E"
        stroke-width="20"
      />
      <circle
        cx="101"
        cy="231"
        r="25"
        stroke="#8BC63E"
        stroke-width="20"
      />
      <path
        d="M171 123L171 92L207 48"
        stroke="#EF3F23"
        stroke-width="20"
      />
      <circle
        cx="221"
        cy="35"
        r="25"
        transform="rotate(-180 221 35)"
        stroke="#EF3F23"
        stroke-width="20"
      />
      <path
        d="M151 123L151 92L115 48"
        stroke="#0095DA"
        stroke-width="20"
      />
      <circle
        r="25"
        transform="matrix(1 0 0 -1 101 35)"
        stroke="#0095DA"
        stroke-width="20"
      />
      <path
        d="M171 143L171 174L207 218"
        stroke="#002B54"
        stroke-width="20"
      />
      <circle
        r="25"
        transform="matrix(-1 0 0 1 221 231)"
        stroke="#002B54"
        stroke-width="20"
      />
      <path
        d="M161 133H271"
        stroke="#E7E8EA"
        stroke-width="20"
      />
      <circle
        cx="286"
        cy="133"
        r="25"
        transform="rotate(-180 286 133)"
        stroke="#E7E8EA"
        stroke-width="20"
      />
      <path
        d="M161 133L51 132"
        stroke="#E7E8EA"
        stroke-width="20"
      />
      <circle
        r="25"
        transform="matrix(1 0 0 -1 35 132)"
        stroke="#E7E8EA"
        stroke-width="20"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ side?: string }>(), { side: 'both' })
</script>
