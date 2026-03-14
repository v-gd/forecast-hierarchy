import { Component, ViewEncapsulation, Input, OnChanges, SimpleChanges, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CrtViewElement, CrtInput, CrtInterfaceDesignerItem } from '@creatio-devkit/common';

@Component({
  selector: 'usr-forecast-hierarchy',
  template: `<div #container></div>`,
  styles: [`:host { display: block; width: 100%; }`],
  encapsulation: ViewEncapsulation.ShadowDom,
})
@CrtViewElement({
  selector: 'usr-forecast-hierarchy',
  type: 'usr.ForecastHierarchy',
})
@CrtInterfaceDesignerItem({
  toolbarConfig: {
    caption: 'Forecast Hierarchy',
    name: 'usr_forecast_hierarchy',
    icon: require('!!raw-loader?{esModule:false}!./icon.svg'),
    defaultPropertyValues: {
      label: 'Forecast Hierarchy',
    },
  },
})
export class ForecastHierarchyComponent implements AfterViewInit, OnChanges {
  @ViewChild('container', { static: true }) containerRef!: ElementRef<HTMLDivElement>;

  @Input() @CrtInput() data: any[] = [];
  @Input() @CrtInput() columns: any[] = [];
  @Input() @CrtInput() hierarchy: any = { idField: 'id', parentIdField: 'parentId', nameField: 'name' };
  @Input() @CrtInput() storageKey: string = 'forecast-hierarchy';

  private fhElement: any = null;

  ngAfterViewInit(): void {
    this.createComponent();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.fhElement) {
      this.updateComponent();
    }
  }

  private createComponent(): void {
    /* Load the main forecast-hierarchy custom element (loaded via AMD bootstrap) */
    this.fhElement = document.createElement('forecast-hierarchy');
    this.fhElement.setAttribute('storage-key', this.storageKey);
    this.updateComponent();
    this.containerRef.nativeElement.appendChild(this.fhElement);
  }

  private updateComponent(): void {
    if (!this.fhElement) return;
    if (this.data) this.fhElement.data = this.data;
    if (this.columns) this.fhElement.columns = this.columns;
    if (this.hierarchy) this.fhElement.hierarchy = this.hierarchy;
  }
}
