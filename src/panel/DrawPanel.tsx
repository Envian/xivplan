import { IStyle, mergeStyleSets } from '@fluentui/merge-styles';
import { ChoiceGroup, IChoiceGroupOption } from '@fluentui/react';
import React, { useCallback } from 'react';
import { BrushSizeControl } from '../BrushSizeControl';
import { CompactColorPicker } from '../CompactColorPicker';
import { CompactSwatchColorPicker } from '../CompactSwatchColorPicker';
import { EditMode, useDrawConfig, useEditMode } from '../EditModeProvider';
import { OpacitySlider } from '../OpacitySlider';
import { useSpinChanged } from '../prefabs/CommonProperties';
import '../prefabs/DrawObjectRenderer';
import { COLOR_SWATCHES } from '../render/SceneTheme';
import { PANEL_PADDING } from './PanelStyles';

const classNames = mergeStyleSets({
    root: {
        padding: PANEL_PADDING,
    } as IStyle,
});

const modeOptions: IChoiceGroupOption[] = [
    {
        key: EditMode.Default,
        text: 'Edit',
        iconProps: { iconName: 'TouchPointer' },
    },
    {
        key: EditMode.Draw,
        text: 'Draw',
        iconProps: { iconName: 'Brush' },
    },
];

export const DrawPanel: React.FC = () => {
    const [editMode, setEditMode] = useEditMode();
    const [config, setConfig] = useDrawConfig();

    const onColorChanged = useCallback((color: string) => setConfig({ ...config, color }), [config, setConfig]);

    const onOpacityChanged = React.useCallback(
        (opacity: number) => {
            if (opacity !== config.opacity) {
                setConfig({ ...config, opacity });
            }
        },
        [config, setConfig],
    );

    const onSizeChanged = useSpinChanged(
        (brushSize: number) => setConfig({ ...config, brushSize }),
        [config, setConfig],
    );

    return (
        <div className={classNames.root}>
            <ChoiceGroup
                label="Tool"
                options={modeOptions}
                selectedKey={editMode}
                onChange={(e, option) => setEditMode(option?.key as EditMode)}
            />
            <CompactColorPicker label="Color" color={config.color} onChange={onColorChanged} />
            <CompactSwatchColorPicker color={config.color} swatches={COLOR_SWATCHES} onChange={onColorChanged} />
            <OpacitySlider value={config.opacity} onChange={onOpacityChanged} />
            <BrushSizeControl
                value={config.brushSize.toString()}
                color={config.color}
                opacity={config.opacity}
                onChange={onSizeChanged}
            />
        </div>
    );
};
