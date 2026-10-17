import { useEffect, useState } from 'react';

// Phone layout: small screens, or touch screens up to tablet size, or a short
// landscape phone. ?mobile=1 or ?desktop=1 in the URL forces one or the other.
const QUERY = '(max-width: 760px), (pointer: coarse) and (max-width: 1100px), (pointer: coarse) and (max-height: 520px)';

const forced = () => {
    const q = new URLSearchParams(window.location.search);
    if (q.has('mobile')) return true;
    if (q.has('desktop')) return false;
    return null;
};

export const isMobileNow = () => forced() ?? (typeof window.matchMedia === 'function' && window.matchMedia(QUERY).matches);

const useMobile = () => {
    const [mobile, setMobile] = useState(isMobileNow);
    useEffect(() => {
        if (forced() !== null || typeof window.matchMedia !== 'function') return undefined;
        const mq = window.matchMedia(QUERY);
        const on = () => setMobile(mq.matches);
        mq.addEventListener?.('change', on);
        return () => mq.removeEventListener?.('change', on);
    }, []);
    return mobile;
};

export default useMobile;
