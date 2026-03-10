import React, { forwardRef } from 'react';

const Card = forwardRef(({
    children,
    className = '',
    style = {},
    onClick,
    ...props
}, ref) => {
    return (
        <div
            ref={ref}
            className={`premium-card ${className}`}
            onClick={onClick}
            style={{
                cursor: onClick ? 'pointer' : 'default',
                ...style
            }}
            {...props}
        >
            {children}
        </div>
    );
});

export default Card;

export function CardHeader({ children, subtitle, className = '' }) {
    return (
        <div className={`premium-card-header ${className}`}>
            <h3 className="premium-card-title">{children}</h3>
            {subtitle && <p className="premium-card-subtitle">{subtitle}</p>}
        </div>
    );
}

export function CardBody({ children, className = '' }) {
    return (
        <div className={`premium-card-info ${className}`}>
            {children}
        </div>
    );
}

export function CardFooter({ children, className = '' }) {
    return (
        <div className={`premium-card-actions ${className}`}>
            {children}
        </div>
    );
}
